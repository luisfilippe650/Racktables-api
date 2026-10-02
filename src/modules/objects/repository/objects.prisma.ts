import { validate } from "../../../shared/validation/validate.js";
import {
  executeDatabaseOperation,
  databaseErrorCode as errorCode,
  waitBeforeRetry,
  type RetryDelay,
} from "../../../shared/database/execute-database-operation.js";
import { Prisma } from "../../../database/prisma.js";
import { Prisma as SQL } from "../../../generated/prisma/client.js";
import type { Prisma as PrismaTypes } from "../../../generated/prisma/client.js";
import { OBJECT_TYPES } from "../../../shared/object-types.js";
import {
  ALLOWED_OBJECT_TYPES,
  MOUNTABLE_OBJECT_TYPES,
  UPDATABLE_OBJECT_TYPES,
} from "../entity/objects.entity.js";
import type {
  ObjectAttributeUpdateValue,
  ObjectCreateResult,
  ObjectDeleteResult,
  ObjectInput,
  ObjectLookupResult,
  ObjectOutput,
  ObjectPortLink,
  ObjectUpdate,
  ObjectUpdateResult,
} from "../entity/objects.entity.js";
import type {
  DictionaryOption,
  ObjectAllOutput,
  ObjectAllQuery,
  ObjectListOutput,
  ObjectPage,
  ObjectPagination,
  ObjectSummaryOutput,
  ObjectTypeOutput,
} from "../entity/objects-query.entity.js";
import type {
  ObjectAllocation,
  ObjectMountDetails,
  ObjectMountInput,
  ObjectMountResult,
  ObjectMoveInput,
  ObjectMoveResult,
  ObjectPlacementFailure,
  ObjectSpace,
  ObjectUnmountResult,
} from "../entity/objects-placement.entity.js";
import {
  ObjectActorSchema,
  ObjectIdSchema,
  ObjectNameSchema,
  toBooleanLike,
} from "../dto/objects-common.dto.js";
import {
  ObjectAllQuerySchema,
  ObjectServiceTagQuerySchema,
  ObjectSummaryQuerySchema,
  ObjectListQuerySchema,
} from "../dto/objects-query.dto.js";
import {
  MountObjectSchema,
  MoveObjectSchema,
} from "../dto/objects-placement.dto.js";
import {
  ObjectsSchema,
  UpdateObjectAttributesSchema,
} from "../dto/objects.dto.js";
import { ObjectsRepository } from "./objects.repository.js";
import { DatabaseOperationError } from "../errors/objects.errors.js";
import { MAX_RACK_HEIGHT } from "../../racks/racks.constants.js";

type Tx = PrismaTypes.TransactionClient;

type AttributeMapRecord = PrismaTypes.AttributeMapGetPayload<{
  include: { Attribute: true };
}>;

type AttributeColumns = {
  string_value: string | null;
  uint_value: number | null;
  float_value: number | null;
};

const NON_EQUIPMENT_TYPES = [
  OBJECT_TYPES.RACK,
  OBJECT_TYPES.ROW,
  OBJECT_TYPES.LOCATION,
];

const equipmentWhere = { objtype_id: { notIn: NON_EQUIPMENT_TYPES } };

const DEFAULT_PAGINATION = { page: 1, per_page: 50 };

const ATOMS = ["front", "interior", "rear"] as const;

const HEIGHT_ATTRIBUTE_ID = 27;

const OBJECT_TYPE_CHAPTER_ID = 1;

const UINT_MAX = 4_294_967_295;

const spaceSelect = { rack_id: true, unit_no: true, atom: true } as const;

function cleanLabel(value: string): string {
  return value.replaceAll("%GPASS%", " ");
}

function dictionaryOptions(
  rows: { dict_key: number; dict_value: string | null }[],
): DictionaryOption[] {
  const options: DictionaryOption[] = [];

  for (const row of rows) {
    if (row.dict_value === null) continue;

    options.push({ id: row.dict_key, name: cleanLabel(row.dict_value) });
  }

  return options;
}

function layout(
  spaces: ObjectSpace[],
): { rack_id: number; units: number[] } | null {
  if (spaces.length === 0) return null;

  const rackId = spaces[0].rack_id;
  const unitNumbers = new Set<number>();
  const positions = new Set<string>();

  for (const space of spaces) {
    if (space.rack_id !== rackId || space.unit_no < 1) return null;

    unitNumbers.add(space.unit_no);
    positions.add(`${space.unit_no}:${space.atom}`);
  }

  const units = [...unitNumbers].sort((a, b) => a - b);
  const firstUnit = units[0];
  const lastUnit = units[units.length - 1];
  const hasConsecutiveUnits = lastUnit - firstUnit + 1 === units.length;
  const hasExpectedSpaceCount = spaces.length === units.length * ATOMS.length;

  if (!hasConsecutiveUnits || !hasExpectedSpaceCount) return null;

  for (const unit of units) {
    for (const atom of ATOMS) {
      if (!positions.has(`${unit}:${atom}`)) return null;
    }
  }

  return { rack_id: rackId, units };
}

function positions(
  rackId: number,
  startUnit: number,
  height: number,
): ObjectSpace[] {
  const spaces: ObjectSpace[] = [];
  const firstUnit = startUnit - height + 1;

  for (let unit = firstUnit; unit <= startUnit; unit++) {
    for (const atom of ATOMS) {
      spaces.push({ rack_id: rackId, unit_no: unit, atom });
    }
  }

  return spaces;
}

export class ObjectsPrismaRepository extends ObjectsRepository {
  constructor(
    private readonly prisma: typeof Prisma = Prisma,
    private readonly retryDelay: RetryDelay = waitBeforeRetry,
  ) {
    super();
  }

  private executeDatabaseOperation<T>(operation: () => Promise<T>): Promise<T> {
    return executeDatabaseOperation(operation, this.retryDelay);
  }

  private transaction<T>(
    callback: (tx: Tx) => Promise<T>,
    write = false,
  ): Promise<T> {
    return this.executeDatabaseOperation(() =>
      this.prisma.$transaction(callback, {
        isolationLevel: write ? "Serializable" : "RepeatableRead",
      }),
    );
  }

  async create(
    data: ObjectInput,
    actor: string | null = null,
  ): Promise<ObjectCreateResult> {
    // Keep type validation at the repository boundary for callers bypassing DTOs.
    if (!ALLOWED_OBJECT_TYPES.includes(data.objtype_id)) {
      return { status: "type_not_allowed" };
    }

    const input = validate(ObjectsSchema, data);

    const user = validate(ObjectActorSchema, actor);

    try {
      return await this.transaction<ObjectCreateResult>(async (tx) => {
        const type = await tx.dictionary.findFirst({
          where: {
            chapter_id: OBJECT_TYPE_CHAPTER_ID,
            dict_key: input.objtype_id,
          },
        });
        if (!type) return { status: "invalid_type" };
        if (
          await tx.object.findFirst({
            where: { name: input.name },
            select: { id: true },
          })
        )
          return { status: "name_conflict" };
        if (
          input.asset_no &&
          (await tx.object.findFirst({
            where: { asset_no: input.asset_no },
            select: { id: true },
          }))
        )
          return { status: "asset_conflict" };
        const object = await tx.object.create({
          data: {
            name: input.name,
            objtype_id: input.objtype_id,
            label: input.label ?? null,
            asset_no: input.asset_no ?? null,
            comment: input.comment ?? null,
            has_problems: "no",
          },
        });
        const ports =
          input.objtype_id === OBJECT_TYPES.SERVER
            ? [
                { name: "kvm", iif_id: 1, type: 33 },
                { name: "eth0", iif_id: 1, type: 24 },
                { name: "eth1", iif_id: 1, type: 24 },
              ]
            : [];
        if (ports.length)
          await tx.port.createMany({
            data: ports.map((port) => ({
              ...port,
              object_id: object.id,
              label: null,
              l2address: null,
            })),
          });
        await tx.objectHistory.create({ data: { ...object, user_name: user } });
        return { status: "created", object, ports_created: ports.length };
      }, true);
    } catch (error) {
      if (
        input.asset_no &&
        error instanceof DatabaseOperationError &&
        errorCode(error.cause) === "P2002"
      ) {
        // Only report an asset conflict if that key actually exists after rollback.
        const conflict = await this.executeDatabaseOperation(() =>
          this.prisma.object.findUnique({
            where: { asset_no: input.asset_no! },
            select: { id: true },
          }),
        );
        if (conflict) return { status: "asset_conflict" };
      }
      throw error;
    }
  }

  async get(id: number): Promise<ObjectOutput | null> {
    const objectId = validate(ObjectIdSchema, id);
    return this.executeDatabaseOperation(() =>
      this.prisma.object.findFirst({
        where: { id: objectId, ...equipmentWhere },
      }),
    );
  }

  private async lookup(
    where: PrismaTypes.ObjectWhereInput,
  ): Promise<ObjectLookupResult> {
    return this.executeDatabaseOperation(async () => {
      const objects = await this.prisma.object.findMany({
        where: { ...where, ...equipmentWhere },
        orderBy: { id: "asc" },
        take: 2,
      });
      if (!objects.length) return { status: "not_found" };
      if (objects.length > 1) return { status: "ambiguous" };
      return { status: "found", object: objects[0] };
    });
  }

  async getByName(name: string): Promise<ObjectLookupResult> {
    return this.lookup({ name: validate(ObjectNameSchema, name) });
  }
  async getByServiceTag(serviceTag: string): Promise<ObjectLookupResult> {
    const { service_tag } = validate(ObjectServiceTagQuerySchema, {
      service_tag: serviceTag,
    });
    return this.lookup({ asset_no: service_tag });
  }

  private async allocations(
    tx: Tx,
    ids: number[],
  ): Promise<Map<number, ObjectAllocation>> {
    if (!ids.length) return new Map();
    const spaces = await tx.rackSpace.findMany({
      where: { object_id: { in: ids } },
      select: { object_id: true, rack_id: true },
    });
    const racksByObject = new Map<number, Set<number>>();
    for (const space of spaces) {
      if (space.object_id === null) continue;
      const racks = racksByObject.get(space.object_id) ?? new Set<number>();
      racks.add(space.rack_id);
      racksByObject.set(space.object_id, racks);
    }
    const singleRackIds = new Set<number>();
    for (const rackIds of racksByObject.values()) {
      if (rackIds.size !== 1) continue;

      for (const rackId of rackIds) {
        singleRackIds.add(rackId);
      }
    }

    const racks = singleRackIds.size
      ? await tx.object.findMany({
          where: {
            id: { in: [...singleRackIds] },
            objtype_id: OBJECT_TYPES.RACK,
          },
          select: { id: true, name: true },
        })
      : [];
    const rackNames = new Map(racks.map((rack) => [rack.id, rack.name]));
    const allocations = new Map<number, ObjectAllocation>();

    for (const id of ids) {
      const rackIds = racksByObject.get(id) ?? new Set<number>();
      const rackId = rackIds.size === 1 ? [...rackIds][0] : null;
      let status: ObjectAllocation["allocation_status"] = "not_allocated";

      if (rackIds.size > 1) {
        status = "inconsistent_multiple_racks";
      } else if (rackIds.size === 1) {
        status = "allocated";
      }

      allocations.set(id, {
        rack_id: rackId !== null && rackNames.has(rackId) ? rackId : null,
        rack_name: rackId !== null ? (rackNames.get(rackId) ?? null) : null,
        rack_count: rackIds.size,
        allocation_status: status,
      });
    }

    return allocations;
  }

  async getAll(
    pagination: ObjectPagination = DEFAULT_PAGINATION,
  ): Promise<ObjectPage<ObjectListOutput>> {
    const page = validate(ObjectListQuerySchema, pagination);
    return this.transaction(async (tx) => {
      const objects = await tx.object.findMany({
        where: equipmentWhere,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (page.page - 1) * page.per_page,
        take: page.per_page,
      });
      const total = await tx.object.count({ where: equipmentWhere });
      const types = objects.length
        ? await tx.dictionary.findMany({
            where: {
              chapter_id: OBJECT_TYPE_CHAPTER_ID,
              dict_key: {
                in: [...new Set(objects.map((object) => object.objtype_id))],
              },
            },
          })
        : [];

      const names = new Map(
        types.map((type) => [type.dict_key, type.dict_value]),
      );
      const allocations = await this.allocations(
        tx,
        objects.map((object) => object.id),
      );
      return {
        ...page,
        total,
        items: objects.map((object) => ({
          object_id: object.id,
          object_name: object.name,
          object_label: object.label,
          asset_no: object.asset_no,
          objtype_id: object.objtype_id,
          object_type: names.get(object.objtype_id) ?? null,
          ...allocations.get(object.id)!,
        })),
      };
    });
  }

  async getAllObjects(
    query: ObjectAllQuery = DEFAULT_PAGINATION,
  ): Promise<ObjectPage<ObjectAllOutput>> {
    const { search, ...page } = validate(ObjectAllQuerySchema, query);
    // LOCATE treats %, _ and backslashes literally and searches numeric IDs too.
    const where = search
      ? SQL.sql`WHERE (
      LOCATE(${search}, CAST(obj.id AS CHAR)) > 0 OR LOCATE(${search}, obj.name) > 0
      OR LOCATE(${search}, obj.label) > 0 OR LOCATE(${search}, obj.asset_no) > 0
      OR LOCATE(${search}, CAST(obj.objtype_id AS CHAR)) > 0 OR LOCATE(${search}, d.dict_value) > 0
      OR LOCATE(${search}, obj.has_problems) > 0 OR LOCATE(${search}, obj.comment) > 0
    )`
      : SQL.empty;
    return this.transaction(async (tx) => {
      const items = await tx.$queryRaw<ObjectAllOutput[]>(SQL.sql`
        SELECT obj.id AS object_id, obj.name AS object_name, obj.label AS object_label,
          obj.asset_no, obj.objtype_id, d.dict_value AS object_type, obj.has_problems, obj.comment
        FROM Object AS obj LEFT JOIN Dictionary AS d ON d.chapter_id = ${OBJECT_TYPE_CHAPTER_ID} AND d.dict_key = obj.objtype_id
        ${where} ORDER BY obj.name, obj.id LIMIT ${page.per_page} OFFSET ${(page.page - 1) * page.per_page}
      `);
      const counts = await tx.$queryRaw<{ total: bigint }[]>(SQL.sql`
        SELECT COUNT(*) AS total FROM Object AS obj
        LEFT JOIN Dictionary AS d ON d.chapter_id = ${OBJECT_TYPE_CHAPTER_ID} AND d.dict_key = obj.objtype_id ${where}
      `);
      return { ...page, total: Number(counts[0].total), items };
    });
  }

  async getTypes(
    pagination: ObjectPagination = DEFAULT_PAGINATION,
  ): Promise<ObjectPage<ObjectTypeOutput>> {
    const page = validate(ObjectListQuerySchema, pagination);
    return this.transaction(async (tx) => {
      const where = {
        chapter_id: OBJECT_TYPE_CHAPTER_ID,
        dict_key: { in: [...ALLOWED_OBJECT_TYPES] },
      };
      const types = await tx.dictionary.findMany({
        where,
        orderBy: [{ dict_value: "asc" }, { dict_key: "asc" }],
        skip: (page.page - 1) * page.per_page,
        take: page.per_page,
      });
      const total = await tx.dictionary.count({ where });
      return {
        ...page,
        total,
        items: types.map((type) => ({
          objtype_id: type.dict_key,
          objtype_name: type.dict_value,
        })),
      };
    });
  }

  async getDictionaryOptions(
    chapterId: number,
    pagination: ObjectPagination = DEFAULT_PAGINATION,
  ): Promise<ObjectPage<DictionaryOption> | null> {
    const chapter_id = validate(ObjectIdSchema, chapterId);
    const page = validate(ObjectListQuerySchema, pagination);
    return this.transaction(async (tx) => {
      const where = { chapter_id, dict_value: { not: null } };
      const total = await tx.dictionary.count({ where });
      if (!total) return null;
      const rows = await tx.dictionary.findMany({
        where,
        orderBy: [{ dict_value: "asc" }, { dict_key: "asc" }],
        skip: (page.page - 1) * page.per_page,
        take: page.per_page,
      });
      return { ...page, total, items: dictionaryOptions(rows) };
    });
  }

  async getSummary(
    id: number,
    includeOptions = false,
  ): Promise<ObjectSummaryOutput | null> {
    const objectId = validate(ObjectIdSchema, id);
    const { include_options } = validate(ObjectSummaryQuerySchema, {
      include_options: includeOptions,
    });
    return this.transaction(async (tx) => {
      const object = await tx.object.findUnique({ where: { id: objectId } });
      if (!object) return null;
      const maps = await tx.attributeMap.findMany({
        where: { objtype_id: object.objtype_id },
        include: { Attribute: true },
        orderBy: { Attribute: { name: "asc" } },
      });
      const values = await tx.attributeValue.findMany({
        where: { object_id: id },
      });
      const valueMap = new Map(values.map((value) => [value.attr_id, value]));
      const allocation = (await this.allocations(tx, [id])).get(id)!;
      const result: ObjectSummaryOutput = {
        object_id: id,
        common_name: object.name,
        visible_label: object.label,
        asset_tag: object.asset_no,
        has_problems: object.has_problems,
        comment: object.comment,
        ...allocation,
        is_allocated: allocation.rack_count > 0,
        row_name: null,
        location_name: null,
        attributes: {},
      };
      if (allocation.rack_id !== null) {
        const rowLink = await tx.entityLink.findFirst({
          where: {
            child_entity_type: "rack",
            child_entity_id: allocation.rack_id,
            parent_entity_type: "row",
          },
          orderBy: { id: "asc" },
        });
        const row = rowLink
          ? await tx.object.findFirst({
              where: {
                id: rowLink.parent_entity_id,
                objtype_id: OBJECT_TYPES.ROW,
              },
            })
          : null;
        result.row_name = row?.name ?? null;
        const locationLink = row
          ? await tx.entityLink.findFirst({
              where: {
                child_entity_type: "row",
                child_entity_id: row.id,
                parent_entity_type: "location",
              },
              orderBy: { id: "asc" },
            })
          : null;
        const location = locationLink
          ? await tx.object.findFirst({
              where: {
                id: locationLink.parent_entity_id,
                objtype_id: OBJECT_TYPES.LOCATION,
              },
            })
          : null;
        result.location_name = location?.name ?? null;
      }
      const chapters = [
        ...new Set(
          maps
            .filter(
              (map) => map.Attribute.type === "dict" && map.chapter_id !== null,
            )
            .map((map) => map.chapter_id!),
        ),
      ];
      const options =
        include_options && chapters.length
          ? await tx.dictionary.findMany({
              where: { chapter_id: { in: chapters } },
              orderBy: [{ dict_value: "asc" }, { dict_key: "asc" }],
            })
          : [];
      for (const map of maps) {
        const { name, type } = map.Attribute;
        if (!name) continue;
        const value = valueMap.get(map.attr_id);
        let output: ObjectSummaryOutput["attributes"][string];
        if (type === "string") output = value?.string_value ?? null;
        else if (type === "float") output = value?.float_value ?? null;
        else if (type === "date")
          output =
            value?.uint_value == null
              ? null
              : new Date(value.uint_value * 1000).toISOString().slice(0, 10);
        else if (type === "dict")
          output = {
            value: value?.uint_value ?? null,
            ...(include_options
              ? {
                  available_options: dictionaryOptions(
                    options.filter(
                      (option) => option.chapter_id === map.chapter_id,
                    ),
                  ),
                }
              : {}),
          };
        else output = value?.uint_value ?? null;
        Object.defineProperty(result.attributes, name, {
          value: output,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      return result;
    });
  }

  private async mountDetails(
    tx: Tx,
    spaces: ObjectSpace[],
  ): Promise<ObjectMountDetails[]> {
    const rackIds = [...new Set(spaces.map((space) => space.rack_id))];
    const racks = await tx.object.findMany({
      where: { id: { in: rackIds }, objtype_id: OBJECT_TYPES.RACK },
      select: { id: true, name: true },
    });
    return rackIds.map((rack_id) => {
      const units = [
        ...new Set(
          spaces
            .filter((space) => space.rack_id === rack_id)
            .map((space) => space.unit_no),
        ),
      ];
      return {
        rack_id,
        rack_name: racks.find((rack) => rack.id === rack_id)?.name ?? null,
        start_unit: Math.max(...units),
        end_unit: Math.min(...units),
        height: units.length,
      };
    });
  }

  private async portLinks(tx: Tx, id: number): Promise<ObjectPortLink[]> {
    const links = await tx.link.findMany({
      where: {
        OR: [
          { Port_Link_portaToPort: { object_id: id } },
          { Port_Link_portbToPort: { object_id: id } },
        ],
      },
      include: {
        Port_Link_portaToPort: { include: { Object: true } },
        Port_Link_portbToPort: { include: { Object: true } },
      },
    });
    const portLinks: ObjectPortLink[] = [];

    for (const link of links) {
      const portA = link.Port_Link_portaToPort;
      const portB = link.Port_Link_portbToPort;
      const directions = [
        [portA, portB],
        [portB, portA],
      ];

      for (const [local, remote] of directions) {
        if (local.object_id !== id) continue;

        portLinks.push({
          local_port_id: local.id,
          local_port_name: local.name,
          remote_port_id: remote.id,
          remote_port_name: remote.name,
          remote_object_id: remote.object_id,
          remote_object_name: remote.Object.name,
          cable: link.cable,
        });
      }
    }

    return portLinks;
  }

  async delete(
    id: number,
    actor: string | null = null,
  ): Promise<ObjectDeleteResult> {
    const objectId = validate(ObjectIdSchema, id);
    const user = validate(ObjectActorSchema, actor);
    return this.transaction<ObjectDeleteResult>(async (tx) => {
      const object = await tx.object.findUnique({ where: { id: objectId } });
      if (!object) return { status: "not_found" };
      if (!ALLOWED_OBJECT_TYPES.includes(object.objtype_id))
        return { status: "type_not_allowed" };
      const spaces = await tx.rackSpace.findMany({
        where: { object_id: id },
        select: spaceSelect,
      });
      if (spaces.length)
        return {
          status: "currently_mounted",
          mounted_in: await this.mountDetails(tx, spaces),
        };
      const links = await this.portLinks(tx, id);
      if (links.length) return { status: "physical_port_links", links };
      if (
        await tx.entityLink.findFirst({
          where: { parent_entity_type: "object", parent_entity_id: id },
          select: { id: true },
        })
      )
        return { status: "has_children" };
      const mounts = await tx.mountOperation.findMany({
        where: { object_id: id },
        select: { old_molecule_id: true, new_molecule_id: true },
      });
      const moleculeIds = new Set<number>();
      for (const mount of mounts) {
        if (mount.old_molecule_id !== null) {
          moleculeIds.add(mount.old_molecule_id);
        }
        if (mount.new_molecule_id !== null) {
          moleculeIds.add(mount.new_molecule_id);
        }
      }
      await tx.fileLink.deleteMany({
        where: { entity_type: "object", entity_id: id },
      });
      await tx.tagStorage.deleteMany({
        where: { entity_realm: "object", entity_id: id },
      });
      await tx.entityLink.deleteMany({
        where: {
          OR: [
            { parent_entity_type: "object", parent_entity_id: id },
            { child_entity_type: "object", child_entity_id: id },
          ],
        },
      });
      // IPv4LB is ignored by Prisma because it has no unique key.
      await tx.$executeRaw`DELETE FROM IPv4LB WHERE object_id = ${id}`;
      await tx.iPv4NAT.deleteMany({ where: { object_id: id } });
      await tx.vLANSwitch.deleteMany({ where: { object_id: id } });
      // PortVLANMode's FK to CachedPVM is restrictive, so remove it before Object cascades.
      await tx.portVLANMode.deleteMany({ where: { object_id: id } });
      await tx.mountOperation.deleteMany({ where: { object_id: id } });
      if (moleculeIds.size)
        await tx.molecule.deleteMany({
          where: { id: { in: [...moleculeIds] } },
        });
      // Keep a deletion snapshot without a cascading object FK.
      await tx.objectHistory.create({
        data: { ...object, id: null, user_name: user },
      });
      await tx.object.update({
        where: { id },
        data: { name: null, label: "" },
      });
      await tx.object.delete({ where: { id } });
      return {
        status: "deleted",
        object_id: id,
        objtype_id: object.objtype_id,
      };
    }, true);
  }

  private async attributeColumns(
    tx: Tx,
    map: AttributeMapRecord,
    value: ObjectAttributeUpdateValue,
  ): Promise<
    | AttributeColumns
    | { message: string; available_options?: DictionaryOption[] }
  > {
    const columns: AttributeColumns = {
      string_value: null,
      uint_value: null,
      float_value: null,
    };
    switch (map.Attribute.type) {
      case "string":
        if (typeof value !== "string" || !value.trim() || value.length > 255)
          return {
            message: "Expected a non-empty string of up to 255 characters.",
          };
        columns.string_value = value.trim();
        break;
      case "uint": {
        const boolean = toBooleanLike(value);
        let number = NaN;
        if (boolean !== null) {
          number = Number(boolean);
        } else if (typeof value === "number") {
          number = value;
        } else if (typeof value === "string" && /^\+?\d+$/.test(value.trim())) {
          number = Number(value);
        }
        if (!Number.isInteger(number) || number < 0 || number > UINT_MAX)
          return { message: "Expected an unsigned 32-bit integer." };
        columns.uint_value = number;
        break;
      }
      case "float": {
        let number = NaN;
        if (typeof value === "number") {
          number = value;
        } else if (typeof value === "string" && value.trim()) {
          number = Number(value);
        }
        if (
          !Number.isFinite(number) ||
          Math.abs(number) > 3.4028234663852886e38
        )
          return {
            message: "Expected a finite float within the database range.",
          };
        columns.float_value = number;
        break;
      }
      case "date": {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
          return { message: "Expected a date in YYYY-MM-DD format." };
        const date = new Date(`${value}T00:00:00Z`);
        const timestamp = date.getTime() / 1000;
        if (
          !Number.isFinite(timestamp) ||
          timestamp < 0 ||
          timestamp > UINT_MAX ||
          date.toISOString().slice(0, 10) !== value
        )
          return {
            message:
              "Expected a valid date within the unsigned timestamp range.",
          };
        columns.uint_value = timestamp;
        break;
      }
      case "dict": {
        if (
          map.chapter_id === null ||
          (typeof value !== "string" && typeof value !== "number")
        )
          return { message: "Expected a dictionary key or label." };
        const rows = await tx.dictionary.findMany({
          where: { chapter_id: map.chapter_id },
          orderBy: { dict_key: "asc" },
        });
        const text = String(value).trim();
        const key = /^\d+$/.test(text) ? Number(text) : NaN;
        const match =
          rows.find((row) => row.dict_key === key) ??
          rows.find(
            (row) => row.dict_value?.toLowerCase() === text.toLowerCase(),
          ) ??
          rows.find(
            (row) =>
              row.dict_value !== null &&
              cleanLabel(row.dict_value).toLowerCase() === text.toLowerCase(),
          );
        if (!match)
          return {
            message: "Invalid dictionary value.",
            available_options: dictionaryOptions(rows).slice(0, 10),
          };
        columns.uint_value = match.dict_key;
        break;
      }
      default:
        return { message: "Unsupported attribute type." };
    }
    return columns;
  }

  async update(
    data: ObjectUpdate,
    actor: string | null = null,
  ): Promise<ObjectUpdateResult> {
    const id = validate(ObjectIdSchema, data.id);
    const user = validate(ObjectActorSchema, actor);
    const parsed = UpdateObjectAttributesSchema.safeParse(data.updates);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        status: "invalid_attribute",
        field: String(issue.path[0] ?? ""),
        message: issue.message,
      };
    }
    const updates = parsed.data;
    try {
      return await this.transaction<ObjectUpdateResult>(async (tx) => {
        const object = await tx.object.findUnique({ where: { id } });
        if (!object) return { status: "not_found" };
        if (!UPDATABLE_OBJECT_TYPES.includes(object.objtype_id))
          return { status: "type_not_allowed" };
        const maps = await tx.attributeMap.findMany({
          where: { objtype_id: object.objtype_id },
          include: { Attribute: true },
        });
        const byName = new Map(maps.map((map) => [map.Attribute.name, map]));
        const fixed: Pick<
          PrismaTypes.ObjectUpdateInput,
          "name" | "label" | "asset_no" | "comment" | "has_problems"
        > = {};
        const dynamic: {
          map: AttributeMapRecord;
          columns: AttributeColumns | null;
        }[] = [];
        for (const [field, value] of Object.entries(updates)) {
          if (
            ["name", "label", "asset_no", "comment", "has_problems"].includes(
              field,
            )
          ) {
            if (
              (field === "name" || field === "asset_no") &&
              value &&
              (await tx.object.findFirst({
                where: { [field]: value, id: { not: id } },
                select: { id: true },
              }))
            ) {
              return {
                status: field === "name" ? "name_conflict" : "asset_conflict",
              };
            }
            Object.assign(fixed, { [field]: value });
            continue;
          }
          const map = byName.get(field);
          if (!map)
            return {
              status: "invalid_attribute",
              field,
              message: "Attribute is not mapped to this object type.",
            };
          if (typeof value === "object" && value !== null && "clear" in value) {
            dynamic.push({ map, columns: null });
            continue;
          }
          const columns = await this.attributeColumns(
            tx,
            map,
            value as ObjectAttributeUpdateValue,
          );
          if ("message" in columns)
            return { status: "invalid_attribute", field, ...columns };
          dynamic.push({ map, columns });
        }
        // Nothing above this line writes: an invalid later field cannot partially commit.
        for (const { map, columns } of dynamic) {
          if (columns === null)
            await tx.attributeValue.deleteMany({
              where: { object_id: id, attr_id: map.attr_id },
            });
          else
            await tx.attributeValue.upsert({
              where: {
                object_id_attr_id: { object_id: id, attr_id: map.attr_id },
              },
              create: {
                object_id: id,
                object_tid: object.objtype_id,
                attr_id: map.attr_id,
                ...columns,
              },
              update: columns,
            });
        }
        const updated = Object.keys(fixed).length
          ? await tx.object.update({ where: { id }, data: fixed })
          : object;
        await tx.objectHistory.create({
          data: { ...updated, user_name: user },
        });
        return {
          status: "updated",
          object: updated,
          fixed_fields_updated: Object.keys(fixed),
          dynamic_attributes_updated: dynamic.length,
        };
      }, true);
    } catch (error) {
      if (
        updates.asset_no &&
        error instanceof DatabaseOperationError &&
        errorCode(error.cause) === "P2002"
      ) {
        const conflict = await this.executeDatabaseOperation(() =>
          this.prisma.object.findFirst({
            where: { asset_no: String(updates.asset_no), id: { not: id } },
            select: { id: true },
          }),
        );
        if (conflict) return { status: "asset_conflict" };
      }
      throw error;
    }
  }

  private async destination(
    tx: Tx,
    rackId: number,
    startUnit: number,
    height: number,
    ignoreObjectId?: number,
  ): Promise<ObjectPlacementFailure | null> {
    const rack = await tx.object.findUnique({ where: { id: rackId } });
    if (!rack || rack.objtype_id !== OBJECT_TYPES.RACK)
      return { status: "rack_not_found" };
    const attribute = await tx.attributeValue.findUnique({
      where: {
        object_id_attr_id: { object_id: rackId, attr_id: HEIGHT_ATTRIBUTE_ID },
      },
    });
    if (attribute?.uint_value == null) return { status: "rack_height_missing" };
    if (
      !Number.isSafeInteger(attribute.uint_value) ||
      attribute.uint_value <= 0 ||
      attribute.uint_value > MAX_RACK_HEIGHT
    )
      return { status: "rack_height_invalid" };
    if (
      height < 1 ||
      startUnit > attribute.uint_value ||
      startUnit - height + 1 < 1
    )
      return { status: "out_of_bounds" };
    const occupied = await tx.rackSpace.findMany({
      where: {
        rack_id: rackId,
        unit_no: { gte: startUnit - height + 1, lte: startUnit },
      },
      orderBy: [{ unit_no: "asc" }, { atom: "asc" }],
    });
    // U/A markers represent unavailable regions; preserve them rather than overwrite.
    const conflict = occupied.find(
      (space) =>
        !(
          ignoreObjectId !== undefined &&
          space.object_id === ignoreObjectId &&
          space.state === "T"
        ),
    );
    if (conflict)
      return {
        status: "space_occupied",
        position: {
          rack_id: rackId,
          unit_no: conflict.unit_no,
          atom: conflict.atom,
        },
        object_id: conflict.object_id,
      };
    return null;
  }

  private async saveMolecule(tx: Tx, spaces: ObjectSpace[]): Promise<number> {
    const molecule = await tx.molecule.create({ data: {} });
    await tx.atom.createMany({
      data: spaces.map((space) => ({ ...space, molecule_id: molecule.id })),
    });
    return molecule.id;
  }

  private async writePositions(
    tx: Tx,
    spaces: ObjectSpace[],
    objectId: number,
  ): Promise<void> {
    for (const space of spaces) {
      await tx.rackSpace.upsert({
        where: { rack_id_unit_no_atom: space },
        create: { ...space, state: "T", object_id: objectId },
        update: { state: "T", object_id: objectId },
      });
    }
  }

  async mount(
    data: ObjectMountInput,
    actor: string | null = null,
  ): Promise<ObjectMountResult> {
    const input = validate(MountObjectSchema, data);
    const user = validate(ObjectActorSchema, actor);
    return this.transaction<ObjectMountResult>(async (tx) => {
      const object = await tx.object.findUnique({
        where: { id: input.object_id },
      });
      if (!object) return { status: "object_not_found" };
      if (!MOUNTABLE_OBJECT_TYPES.includes(object.objtype_id))
        return { status: "type_not_allowed" };
      const allocated = await tx.rackSpace.findMany({
        where: { object_id: input.object_id },
        select: spaceSelect,
      });
      if (allocated.length) return { status: "already_mounted" };
      const failure = await this.destination(
        tx,
        input.rack_id,
        input.start_unit,
        input.height,
      );
      if (failure) return failure;
      const spaces = positions(input.rack_id, input.start_unit, input.height);
      await this.writePositions(tx, spaces, input.object_id);
      const molecule_id = await this.saveMolecule(tx, spaces);
      const end_unit = input.start_unit - input.height + 1;
      await tx.mountOperation.create({
        data: {
          object_id: input.object_id,
          old_molecule_id: null,
          new_molecule_id: molecule_id,
          user_name: user,
          comment: `Automated mount in rack ${input.rack_id}: units ${end_unit}-${input.start_unit}`,
        },
      });
      await tx.rackThumbnail.deleteMany({ where: { rack_id: input.rack_id } });
      return {
        status: "mounted",
        allocation: { ...input, end_unit, molecule_id },
      };
    }, true);
  }

  async unmount(
    id: number,
    actor: string | null = null,
  ): Promise<ObjectUnmountResult> {
    const objectId = validate(ObjectIdSchema, id);
    const user = validate(ObjectActorSchema, actor);
    return this.transaction<ObjectUnmountResult>(async (tx) => {
      const object = await tx.object.findUnique({ where: { id: objectId } });
      if (!object) return { status: "object_not_found" };
      if (!MOUNTABLE_OBJECT_TYPES.includes(object.objtype_id))
        return { status: "type_not_allowed" };
      const spaces = await tx.rackSpace.findMany({
        where: { object_id: id },
        select: spaceSelect,
      });
      if (!spaces.length) return { status: "not_mounted" };
      const current = layout(spaces);
      if (!current) return { status: "inconsistent_allocation" };
      await tx.rackSpace.deleteMany({ where: { object_id: id } });
      const molecule_id = await this.saveMolecule(tx, spaces);
      await tx.mountOperation.create({
        data: {
          object_id: id,
          old_molecule_id: molecule_id,
          new_molecule_id: null,
          user_name: user,
          comment: `Automated unmount from rack ${current.rack_id}: units ${current.units[0]}-${current.units[current.units.length - 1]}`,
        },
      });
      await tx.rackThumbnail.deleteMany({
        where: { rack_id: current.rack_id },
      });
      return {
        status: "unmounted",
        allocation: {
          object_id: id,
          rack_id: current.rack_id,
          units_removed: current.units,
          molecule_id,
        },
      };
    }, true);
  }

  async move(
    data: ObjectMoveInput,
    actor: string | null = null,
  ): Promise<ObjectMoveResult> {
    const input = validate(MoveObjectSchema, data);
    const user = validate(ObjectActorSchema, actor);
    return this.transaction<ObjectMoveResult>(async (tx) => {
      const object = await tx.object.findUnique({
        where: { id: input.object_id },
      });
      if (!object) return { status: "object_not_found" };
      if (!MOUNTABLE_OBJECT_TYPES.includes(object.objtype_id))
        return { status: "type_not_allowed" };
      const oldSpaces = await tx.rackSpace.findMany({
        where: { object_id: input.object_id },
        select: spaceSelect,
      });
      if (!oldSpaces.length) return { status: "not_mounted" };
      const current = layout(oldSpaces);
      if (!current) return { status: "inconsistent_allocation" };
      const height = current.units.length;
      const failure = await this.destination(
        tx,
        input.destination_rack_id,
        input.start_unit,
        height,
        input.object_id,
      );
      if (failure) return failure;
      const spaces = positions(
        input.destination_rack_id,
        input.start_unit,
        height,
      );
      await tx.rackSpace.deleteMany({ where: { object_id: input.object_id } });
      await this.writePositions(tx, spaces, input.object_id);
      const old_molecule_id = await this.saveMolecule(tx, oldSpaces);
      const new_molecule_id = await this.saveMolecule(tx, spaces);
      const end_unit = input.start_unit - height + 1;
      await tx.mountOperation.create({
        data: {
          object_id: input.object_id,
          old_molecule_id,
          new_molecule_id,
          user_name: user,
          comment: `Automated move from rack ${current.rack_id} to rack ${input.destination_rack_id}: units ${end_unit}-${input.start_unit}`,
        },
      });
      await tx.rackThumbnail.deleteMany({
        where: {
          rack_id: {
            in: [...new Set([current.rack_id, input.destination_rack_id])],
          },
        },
      });
      return {
        status: "moved",
        allocation: {
          ...input,
          source_rack_id: current.rack_id,
          height,
          end_unit,
          old_molecule_id,
          new_molecule_id,
        },
      };
    }, true);
  }
}
