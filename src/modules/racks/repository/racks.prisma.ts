import { Prisma } from "../../../database/prisma.js";
import type { Prisma as PrismaTypes } from "../../../generated/prisma/client.js";
import { OBJECT_TYPES } from "../../../shared/object-types.js";
import type {
  RackCreateResult,
  RackDeleteResult,
  RackDetailsOutput,
  RackInput,
  RackOccupancyData,
  RackPagination,
  RackPage,
  RackSpaceResult,
  RackOutput,
  RackSpaceAtom,
  RackSpaceOutput,
  RackUpdate,
  RackUpdateResult,
} from "../entity/racks.entity.js";
import { DatabaseOperationError } from "../errors/racks.errors.js";
import { DEFAULT_RACK_HEIGHT } from "../racks.constants.js";
import { RacksRepository } from "./racks.repository.js";

const RACK_HEIGHT_ATTRIBUTE_ID = 27;
const RACK_SORT_ORDER_ATTRIBUTE_ID = 29;

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

const spaceSelect = {
  rack_id: true,
  unit_no: true,
  atom: true,
  state: true,
  object_id: true,
  Object_RackSpace_object_idToObject: { select: { name: true } },
} satisfies PrismaTypes.RackSpaceSelect;

type SpaceRecord = PrismaTypes.RackSpaceGetPayload<{
  select: typeof spaceSelect;
}>;

function toSpaceOutput(space: SpaceRecord): RackSpaceOutput {
  const { Object_RackSpace_object_idToObject: object, ...position } = space;
  return { ...position, object_name: object?.name ?? null };
}

export class RacksPrismaRepository extends RacksRepository {
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

  async create(
    data: RackInput,
    actor: string | null = null,
  ): Promise<RackCreateResult> {
    // Execute the transaction with retry handling for serialization conflicts.
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          // Confirm the target row exists and has the correct object type.
          const row = await tx.object.findFirst({
            where: { id: data.row_id, objtype_id: OBJECT_TYPES.ROW },
            select: { id: true },
          });

          if (!row) return { status: "row_not_found" };

          // Reject a rack name that is already in use.
          const existingRack = await tx.object.findFirst({
            where: { name: data.name, objtype_id: OBJECT_TYPES.RACK },
            select: { id: true },
          });

          if (existingRack) return { status: "name_conflict" };

          // Use the default height when none was supplied, and reject a duplicate asset number.
          const height = data.rack_height ?? DEFAULT_RACK_HEIGHT;
          if (data.asset_no) {
            const existingAsset = await tx.object.findUnique({
              where: { asset_no: data.asset_no },
              select: { id: true },
            });
            if (existingAsset) return { status: "asset_conflict" };
          }

          // Find the next sort order among racks already linked to this row.
          const links = await tx.entityLink.findMany({
            where: {
              parent_entity_type: "row",
              parent_entity_id: row.id,
              child_entity_type: "rack",
            },
            select: { child_entity_id: true },
          });
          const lastSortOrder = await tx.attributeValue.aggregate({
            where: {
              object_id: { in: links.map((link) => link.child_entity_id) },
              attr_id: RACK_SORT_ORDER_ATTRIBUTE_ID,
            },
            _max: { uint_value: true },
          });
          const nextSortOrder = (lastSortOrder._max.uint_value ?? 0) + 1;
          // Reject overflow before writing any rack data.
          if (nextSortOrder > 4_294_967_295) {
            return { status: "sort_order_exhausted" };
          }
          let rack: RackOutput;
          try {
            // Create the rack object; the unique database constraint also protects against races.
            rack = await tx.object.create({
              data: {
                name: data.name,
                objtype_id: OBJECT_TYPES.RACK,
                asset_no: data.asset_no ?? null,
              },
            });
          } catch (error) {
            // Object.create supplies no id; asset_no is its only other unique key.
            // Keep the database constraint as the final guard against a write race.
            if (
              data.asset_no &&
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              error.code === "P2002"
            ) {
              return { status: "asset_conflict" };
            }
            throw error;
          }
          // Store the rack height and its order within the row.
          await tx.attributeValue.createMany({
            data: [
              {
                object_id: rack.id,
                object_tid: OBJECT_TYPES.RACK,
                attr_id: RACK_HEIGHT_ATTRIBUTE_ID,
                uint_value: height,
              },
              {
                object_id: rack.id,
                object_tid: OBJECT_TYPES.RACK,
                attr_id: RACK_SORT_ORDER_ATTRIBUTE_ID,
                uint_value: nextSortOrder,
              },
            ],
          });
          // Link the new rack to its row.
          await tx.entityLink.create({
            data: {
              parent_entity_type: "row",
              parent_entity_id: row.id,
              child_entity_type: "rack",
              child_entity_id: rack.id,
            },
          });
          // Record who created the rack, then return the created object.
          await tx.objectHistory.create({
            data: { ...rack, user_name: actor },
          });
          return { status: "created", rack };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async update(
    data: RackUpdate,
    actor: string | null = null,
  ): Promise<RackUpdateResult> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const rack = await tx.object.findFirst({
            where: { id: data.id, objtype_id: OBJECT_TYPES.RACK },
            select: { id: true },
          });
          if (!rack) return { status: "not_found" };
          const existingRack = await tx.object.findFirst({
            where: {
              name: data.name,
              objtype_id: OBJECT_TYPES.RACK,
              id: { not: data.id },
            },
            select: { id: true },
          });
          if (existingRack) return { status: "name_conflict" };
          const updatedRack = await tx.object.update({
            where: { id: data.id, objtype_id: OBJECT_TYPES.RACK },
            data: { name: data.name },
          });
          await tx.objectHistory.create({
            data: { ...updatedRack, user_name: actor },
          });
          return { status: "updated", rack: updatedRack };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async delete(id: number): Promise<RackDeleteResult> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const rack = await tx.object.findFirst({
            where: { id, objtype_id: OBJECT_TYPES.RACK },
            select: { id: true },
          });
          if (!rack) return { status: "not_found" };
          const child = await tx.entityLink.findFirst({
            where: {
              parent_entity_type: { in: ["rack", "object"] },
              parent_entity_id: id,
            },
            select: { id: true },
          });
          const allocation = await tx.rackSpace.findFirst({
            where: {
              rack_id: id,
              OR: [{ object_id: { not: null } }, { state: "T" }],
            },
            select: { rack_id: true },
          });
          if (child || allocation) return { status: "has_children" };
          await tx.fileLink.deleteMany({
            where: { entity_type: { in: ["rack", "object"] }, entity_id: id },
          });
          await tx.tagStorage.deleteMany({
            where: { entity_realm: { in: ["rack", "object"] }, entity_id: id },
          });
          await tx.entityLink.deleteMany({
            where: {
              OR: [
                {
                  child_entity_type: { in: ["rack", "object"] },
                  child_entity_id: id,
                },
                {
                  parent_entity_type: { in: ["rack", "object"] },
                  parent_entity_id: id,
                },
              ],
            },
          });
          // RackSpace's rack foreign key does not cascade on deletion.
          await tx.rackSpace.deleteMany({ where: { rack_id: id } });
          await tx.object.delete({
            where: { id, objtype_id: OBJECT_TYPES.RACK },
          });
          return { status: "deleted" };
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async get(id: number): Promise<RackOutput | null> {
    return this.executeDatabaseOperation(() =>
      this.prisma.object.findFirst({
        where: { id, objtype_id: OBJECT_TYPES.RACK },
      }),
    );
  }

  async getByName(name: string): Promise<RackOutput | null> {
    return this.executeDatabaseOperation(() =>
      this.prisma.object.findFirst({
        where: { name, objtype_id: OBJECT_TYPES.RACK },
      }),
    );
  }

  async getAll(
    pagination: RackPagination = { page: 1, per_page: 50 },
  ): Promise<RackPage<RackOutput>> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const where = { objtype_id: OBJECT_TYPES.RACK };

          const items = await tx.object.findMany({
            where,
            orderBy: [{ name: "asc" }, { id: "asc" }],
            skip: (pagination.page - 1) * pagination.per_page,
            take: pagination.per_page,
          });

          const total = await tx.object.count({ where });
          return { ...pagination, items, total };
        },
        { isolationLevel: "RepeatableRead" },
      ),
    );
  }

  async getDetails(rackId: number): Promise<RackDetailsOutput | null> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const rack = await tx.object.findFirst({
            where: { id: rackId, objtype_id: OBJECT_TYPES.RACK },
          });
          if (!rack) return null;
          // Read base tables: the Rack view hides racks without a row.
          const attributes = await tx.attributeValue.findMany({
            where: {
              object_id: rackId,
              attr_id: {
                in: [RACK_HEIGHT_ATTRIBUTE_ID, RACK_SORT_ORDER_ATTRIBUTE_ID],
              },
            },
            select: { attr_id: true, uint_value: true },
          });
          const rowLink = await tx.entityLink.findFirst({
            where: {
              child_entity_type: "rack",
              child_entity_id: rackId,
              parent_entity_type: "row",
            },
            orderBy: { id: "asc" },
            select: { parent_entity_id: true },
          });
          const row = rowLink
            ? await tx.object.findFirst({
                where: {
                  id: rowLink.parent_entity_id,
                  objtype_id: OBJECT_TYPES.ROW,
                },
                select: { id: true, name: true },
              })
            : null;
          const locationLink = row
            ? await tx.entityLink.findFirst({
                where: {
                  child_entity_type: "row",
                  child_entity_id: row.id,
                  parent_entity_type: "location",
                },
                orderBy: { id: "asc" },
                select: { parent_entity_id: true },
              })
            : null;
          const location = locationLink
            ? await tx.object.findFirst({
                where: {
                  id: locationLink.parent_entity_id,
                  objtype_id: OBJECT_TYPES.LOCATION,
                },
                select: { id: true, name: true },
              })
            : null;
          return {
            ...rack,
            height:
              attributes.find(
                (value) => value.attr_id === RACK_HEIGHT_ATTRIBUTE_ID,
              )?.uint_value ?? null,
            sort_order:
              attributes.find(
                (value) => value.attr_id === RACK_SORT_ORDER_ATTRIBUTE_ID,
              )?.uint_value ?? null,
            row_id: row?.id ?? null,
            row_name: row?.name ?? null,
            location_id: location?.id ?? null,
            location_name: location?.name ?? null,
          };
        },
        { isolationLevel: "RepeatableRead" },
      ),
    );
  }

  private async readOccupancyData(
    tx: PrismaTypes.TransactionClient,
    racks: RackOutput[],
  ): Promise<RackOccupancyData[]> {
    if (racks.length === 0) return [];
    const ids = racks.map((rack) => rack.id);
    const heights = await tx.attributeValue.findMany({
      where: { object_id: { in: ids }, attr_id: RACK_HEIGHT_ATTRIBUTE_ID },
      select: { object_id: true, uint_value: true },
    });
    const spaces = await tx.rackSpace.findMany({
      where: { rack_id: { in: ids } },
      select: { rack_id: true, unit_no: true, state: true, object_id: true },
      orderBy: [{ rack_id: "asc" }, { unit_no: "asc" }],
    });
    const heightsById = new Map(
      heights.map((height) => [height.object_id, height.uint_value]),
    );
    const spacesById = new Map<number, RackOccupancyData["spaces"]>();
    for (const { rack_id, ...space } of spaces) {
      const positions = spacesById.get(rack_id) ?? [];
      positions.push(space);
      spacesById.set(rack_id, positions);
    }
    return racks.map((rack) => ({
      rack_id: rack.id,
      rack_name: rack.name,
      height: heightsById.get(rack.id) ?? null,
      spaces: spacesById.get(rack.id) ?? [],
    }));
  }

  async getOccupancy(rackId: number): Promise<RackOccupancyData | null> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const rack = await tx.object.findFirst({
            where: { id: rackId, objtype_id: OBJECT_TYPES.RACK },
          });
          if (!rack) return null;
          const [data] = await this.readOccupancyData(tx, [rack]);
          return data;
        },
        { isolationLevel: "RepeatableRead" },
      ),
    );
  }

  async getOccupancyAll(
    pagination: RackPagination = { page: 1, per_page: 50 },
  ): Promise<RackPage<RackOccupancyData>> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const where = { objtype_id: OBJECT_TYPES.RACK };

          const racks = await tx.object.findMany({
            where,
            orderBy: [{ name: "asc" }, { id: "asc" }],
            skip: (pagination.page - 1) * pagination.per_page,
            take: pagination.per_page,
          });
          const total = await tx.object.count({ where });
          const items = await this.readOccupancyData(tx, racks);
          return { ...pagination, items, total };
        },
        { isolationLevel: "RepeatableRead" },
      ),
    );
  }

  async getSpaces(rackId: number): Promise<RackSpaceOutput[] | null> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const rack = await tx.object.findFirst({
            where: { id: rackId, objtype_id: OBJECT_TYPES.RACK },
            select: { id: true },
          });
          if (!rack) return null;
          const spaces = await tx.rackSpace.findMany({
            where: { rack_id: rackId },
            select: spaceSelect,
            orderBy: [{ unit_no: "asc" }, { atom: "asc" }],
          });
          return spaces.map(toSpaceOutput);
        },
        { isolationLevel: "RepeatableRead" },
      ),
    );
  }

  async getSpace(
    rackId: number,
    unitNo: number,
    atom: RackSpaceAtom,
  ): Promise<RackSpaceResult> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const rack = await tx.object.findFirst({
            where: { id: rackId, objtype_id: OBJECT_TYPES.RACK },
            select: { id: true },
          });
          if (!rack) return { status: "rack_not_found" };
          const space = await tx.rackSpace.findUnique({
            where: {
              rack_id_unit_no_atom: { rack_id: rackId, unit_no: unitNo, atom },
            },
            select: spaceSelect,
          });
          return {
            status: "found",
            space: space ? toSpaceOutput(space) : null,
          };
        },
        { isolationLevel: "RepeatableRead" },
      ),
    );
  }

  async getObjectSpaces(
    rackId: number,
    objectId: number,
  ): Promise<RackSpaceOutput[] | null> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(
        async (tx) => {
          const rack = await tx.object.findFirst({
            where: { id: rackId, objtype_id: OBJECT_TYPES.RACK },
            select: { id: true },
          });
          if (!rack) return null;
          const spaces = await tx.rackSpace.findMany({
            where: { rack_id: rackId, object_id: objectId },
            select: spaceSelect,
            orderBy: [{ unit_no: "asc" }, { atom: "asc" }],
          });
          return spaces.map(toSpaceOutput);
        },
        { isolationLevel: "RepeatableRead" },
      ),
    );
  }
}
