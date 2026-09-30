import { Prisma } from "../../../database/prisma.js";
import { OBJECT_TYPES } from "../../../shared/object-types.js";
import {
  RowInput,
  RowOutput,
  RowUpdate,
  RowWithLocationInput,
  RowCreateResult,
  RowCreateWithLocationResult,
  RowUpdateResult,
  RowDeleteResult,
  RowLinkToLocationResult,
  RowUnlinkFromLocationResult,
} from "../entity/rows.entity.js";
import { DatabaseOperationError } from "../errors/rows.errors.js";
import { RowRepository } from "./rows.repository.js";

/* ----------------------------
Esse código repete uma transação quando o Prisma retorna o erro `P2034`, que indica conflito ou deadlock:

 - Faz no máximo 3 tentativas.
- Espera 25 ms antes da segunda e 50 ms antes da terceira.
- `RetryDelay` permite substituir a espera real nos testes.
- `isTransactionConflict()` verifica com segurança se o erro possui o código `P2034`.
- Se continuar falhando após três tentativas, o repository lança `DatabaseOperationError`.

*/

const MAX_TRANSACTION_ATTEMPTS = 3;
const INITIAL_TRANSACTION_RETRY_DELAY_MS = 25;

type RetryDelay = (delayMs: number) => Promise<void>;

const waitBeforeRetry: RetryDelay = (delayMs) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

function isTransactionConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}
//----------------------

export class RowPrismaRepository extends RowRepository {
  constructor(
    private readonly prisma: typeof Prisma = Prisma,
    private readonly retryDelay: RetryDelay = waitBeforeRetry,
  ) {
    super();
  }

  private async executeDatabaseOperation<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (
          isTransactionConflict(error) &&
          attempt < MAX_TRANSACTION_ATTEMPTS
        ) {
          await this.retryDelay(
            INITIAL_TRANSACTION_RETRY_DELAY_MS * 2 ** (attempt - 1),
          );
          continue;
        }

        throw new DatabaseOperationError(error);
      }
    }

    throw new DatabaseOperationError(
      new Error("Database operation exhausted all retry attempts."),
    );
  }

  async create(data: RowInput): Promise<RowCreateResult> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const existingRow = await tx.object.findFirst({
            where: { name: data.name, objtype_id: OBJECT_TYPES.ROW },
            select: { id: true },
          });

          if (existingRow) {
            return { status: "name_conflict" };
          }

          const row = await tx.object.create({
            data: {
              name: data.name,
              objtype_id: OBJECT_TYPES.ROW,
            },
          });

          return { status: "created", row };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async createWithLocation(
    data: RowWithLocationInput,
  ): Promise<RowCreateWithLocationResult> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const location = await tx.object.findFirst({
            where: {
              id: data.locationId,
              objtype_id: OBJECT_TYPES.LOCATION,
            },
            select: { id: true },
          });

          if (!location) {
            return { status: "location_not_found" };
          }

          const existingRow = await tx.object.findFirst({
            where: { name: data.name, objtype_id: OBJECT_TYPES.ROW },
            select: { id: true },
          });

          if (existingRow) {
            return { status: "name_conflict" };
          }

          const row = await tx.object.create({
            data: {
              name: data.name,
              objtype_id: OBJECT_TYPES.ROW,
            },
          });

          await tx.entityLink.create({
            data: {
              parent_entity_type: "location",
              parent_entity_id: location.id,
              child_entity_type: "row",
              child_entity_id: row.id,
            },
          });

          return { status: "created", row };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async delete(id: number): Promise<RowDeleteResult> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const row = await tx.object.findFirst({
            where: {
              id,
              objtype_id: OBJECT_TYPES.ROW,
            },
            select: { id: true },
          });

          if (!row) {
            return { status: "not_found" };
          }

          const linkAsParent = await tx.entityLink.findFirst({
            where: {
              parent_entity_type: "row",
              parent_entity_id: id,
            },
            select: { id: true },
          });

          if (linkAsParent) {
            return { status: "has_children" };
          }

          await tx.fileLink.deleteMany({
            where: {
              entity_type: "row",
              entity_id: id,
            },
          });

          await tx.tagStorage.deleteMany({
            where: {
              entity_realm: "object",
              entity_id: id,
            },
          });

          await tx.entityLink.deleteMany({
            where: {
              child_entity_type: "row",
              child_entity_id: id,
            },
          });

          await tx.object.delete({
            where: {
              id,
              objtype_id: OBJECT_TYPES.ROW,
            },
          });

          return { status: "deleted" };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async update(data: RowUpdate): Promise<RowUpdateResult> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const row = await tx.object.findFirst({
            where: { id: data.id, objtype_id: OBJECT_TYPES.ROW },
            select: { id: true },
          });

          if (!row) {
            return { status: "not_found" };
          }

          const existingRow = await tx.object.findFirst({
            where: {
              name: data.name,
              objtype_id: OBJECT_TYPES.ROW,
              id: { not: data.id },
            },
            select: { id: true },
          });

          if (existingRow) {
            return { status: "name_conflict" };
          }

          const updatedRow = await tx.object.update({
            where: { id: data.id, objtype_id: OBJECT_TYPES.ROW },
            data: { name: data.name },
          });

          return { status: "updated", row: updatedRow };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async linkToLocation(
    rowId: number,
    locationId: number,
  ): Promise<RowLinkToLocationResult> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const row = await tx.object.findFirst({
            where: { id: rowId, objtype_id: OBJECT_TYPES.ROW },
            select: { id: true },
          });

          if (!row) {
            return { status: "row_not_found" };
          }

          const location = await tx.object.findFirst({
            where: { id: locationId, objtype_id: OBJECT_TYPES.LOCATION },
            select: { id: true },
          });

          if (!location) {
            return { status: "location_not_found" };
          }

          const existingLinks = await tx.entityLink.findMany({
            where: {
              parent_entity_type: "location",
              child_entity_type: "row",
              child_entity_id: rowId,
            },
            select: { parent_entity_id: true },
          });

          const conflictingLink = existingLinks.find(
            (link) => link.parent_entity_id !== locationId,
          );

          if (conflictingLink) {
            return {
              status: "location_conflict",
              locationId: conflictingLink.parent_entity_id,
            };
          }

          if (existingLinks.length > 0) {
            return { status: "already_linked" };
          }

          await tx.entityLink.create({
            data: {
              parent_entity_type: "location",
              parent_entity_id: locationId,
              child_entity_type: "row",
              child_entity_id: rowId,
            },
          });

          return { status: "linked" };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async unlinkFromLocation(
    rowId: number,
    locationId: number,
  ): Promise<RowUnlinkFromLocationResult> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const row = await tx.object.findFirst({
            where: { id: rowId, objtype_id: OBJECT_TYPES.ROW },
            select: { id: true },
          });

          if (!row) {
            return { status: "row_not_found" };
          }

          const location = await tx.object.findFirst({
            where: { id: locationId, objtype_id: OBJECT_TYPES.LOCATION },
            select: { id: true },
          });

          if (!location) {
            return { status: "location_not_found" };
          }

          const link = await tx.entityLink.findFirst({
            where: {
              parent_entity_type: "location",
              parent_entity_id: locationId,
              child_entity_type: "row",
              child_entity_id: rowId,
            },
            select: { id: true },
          });

          if (!link) {
            return { status: "link_not_found" };
          }

          const childLink = await tx.entityLink.findFirst({
            where: {
              parent_entity_type: "row",
              parent_entity_id: rowId,
            },
            select: { id: true },
          });

          if (childLink) {
            return { status: "has_children" };
          }

          await tx.entityLink.deleteMany({
            where: {
              parent_entity_type: "location",
              parent_entity_id: locationId,
              child_entity_type: "row",
              child_entity_id: rowId,
            },
          });

          return { status: "unlinked" };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async get(id: number): Promise<RowOutput | null> {
    return this.executeDatabaseOperation(() =>
      this.prisma.object.findFirst({
        where: { id, objtype_id: OBJECT_TYPES.ROW },
      }),
    );
  }

  async getByName(name: string): Promise<RowOutput | null> {
    return this.executeDatabaseOperation(() =>
      this.prisma.object.findFirst({
        where: { name, objtype_id: OBJECT_TYPES.ROW },
      }),
    );
  }

  async getAll(): Promise<RowOutput[]> {
    return this.executeDatabaseOperation(() =>
      this.prisma.object.findMany({
        where: { objtype_id: OBJECT_TYPES.ROW },
        orderBy: { name: "asc" },
      }),
    );
  }
}
