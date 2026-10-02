import { Prisma } from "../../../database/prisma.js";
import {
  executeDatabaseOperation,
  waitBeforeRetry,
  type RetryDelay,
} from "../../../shared/database/execute-database-operation.js";
import { validate } from "../../../shared/validation/validate.js";
import { OBJECT_TYPES } from "../../../shared/object-types.js";
import {
  CreateLocationSchema,
  UpdateLocationInputSchema,
  IDLocationSchema,
} from "../dto/locations.dto.js";
import type {
  LocationInput,
  LocationUpdateInput,
  LocationOutput,
  LocationDeleteResult,
  LocationCreateResult,
  LocationUpdateResult,
} from "../entity/locations.entity.js";
import { LocationsRepository } from "./locations.repository.js";

export class LocationPrismaRepository extends LocationsRepository {
  constructor(
    private readonly prisma: typeof Prisma = Prisma,
    private readonly retryDelay: RetryDelay = waitBeforeRetry,
  ) {
    super();
  }

  private executeDatabaseOperation<T>(operation: () => Promise<T>): Promise<T> {
    return executeDatabaseOperation(operation, this.retryDelay);
  }

  async create(data: LocationInput): Promise<LocationCreateResult> {
    data = validate(CreateLocationSchema, data);
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.object.findFirst({
            where: { name: data.name, objtype_id: OBJECT_TYPES.LOCATION },
            select: { id: true },
          });
          if (existing) return { status: "name_conflict" };
          const location = await tx.object.create({
            data: { name: data.name, objtype_id: OBJECT_TYPES.LOCATION },
          });
          return { status: "created", location };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async update(data: LocationUpdateInput): Promise<LocationUpdateResult> {
    data = validate(UpdateLocationInputSchema, data);
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const location = await tx.object.findFirst({
            where: { id: data.id, objtype_id: OBJECT_TYPES.LOCATION },
            select: { id: true },
          });
          if (!location) return { status: "not_found" };
          const existing = await tx.object.findFirst({
            where: {
              name: data.name,
              objtype_id: OBJECT_TYPES.LOCATION,
              id: { not: data.id },
            },
            select: { id: true },
          });
          if (existing) return { status: "name_conflict" };
          const updated = await tx.object.update({
            where: { id: data.id, objtype_id: OBJECT_TYPES.LOCATION },
            data: { name: data.name },
          });
          return { status: "updated", location: updated };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async delete(id: number): Promise<LocationDeleteResult> {
    id = validate(IDLocationSchema, id);
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const location = await tx.object.findFirst({
            where: { id, objtype_id: OBJECT_TYPES.LOCATION },
            select: { id: true },
          });
          if (!location) return { status: "not_found" };
          const linkedRow = await tx.entityLink.findFirst({
            where: {
              parent_entity_type: { in: ["location", "object"] },
              parent_entity_id: id,
              child_entity_type: "row",
            },
            select: { id: true },
          });
          if (linkedRow) return { status: "has_rows" };
          await tx.fileLink.deleteMany({
            where: {
              entity_type: { in: ["location", "object"] },
              entity_id: id,
            },
          });
          await tx.tagStorage.deleteMany({
            where: {
              entity_realm: { in: ["location", "object"] },
              entity_id: id,
            },
          });
          await tx.entityLink.deleteMany({
            where: {
              OR: [
                {
                  parent_entity_type: { in: ["location", "object"] },
                  parent_entity_id: id,
                },
                {
                  child_entity_type: { in: ["location", "object"] },
                  child_entity_id: id,
                },
              ],
            },
          });
          await tx.object.delete({
            where: { id, objtype_id: OBJECT_TYPES.LOCATION },
          });
          return { status: "deleted" };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async get(id: number): Promise<LocationOutput | null> {
    id = validate(IDLocationSchema, id);
    return this.executeDatabaseOperation(() =>
      this.prisma.object.findFirst({
        where: { id, objtype_id: OBJECT_TYPES.LOCATION },
      }),
    );
  }

  async getAll(): Promise<LocationOutput[]> {
    return this.executeDatabaseOperation(() =>
      this.prisma.object.findMany({
        where: { objtype_id: OBJECT_TYPES.LOCATION },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
    );
  }
}
