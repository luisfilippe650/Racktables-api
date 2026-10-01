import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma as Client } from "../../../src/database/prisma.js";
import type { RacksRepository } from "../../../src/modules/racks/repository/racks.repository.js";
import { RacksPrismaRepository } from "../../../src/modules/racks/repository/racks.prisma.js";
import { RacksService } from "../../../src/modules/racks/racks.service.js";
import { ApplicationError } from "../../../src/shared/errors/application.error.js";

const rack = {
  id: 42,
  name: "Rack A",
  objtype_id: 1560,
  asset_no: null,
  label: null,
  comment: null,
  has_problems: "no" as const,
};
function client(tx: object) {
  return {
    ...tx,
    $transaction: async (operation: (tx: object) => Promise<unknown>) =>
      operation(tx),
  } as unknown as typeof Client;
}
const errorCode = (code: string) => (error: unknown) => {
  assert.ok(error instanceof ApplicationError);
  assert.equal(error.code, code);
  return true;
};

test("duplicate asset_no maps to a domain conflict, including a write race", async () => {
  const tx = {
    object: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        where.id === 7 ? { id: 7 } : null,
      findUnique: async () => null,
      create: async () => {
        throw { code: "P2002", meta: { target: "asset_no" } };
      },
    },
    entityLink: { findMany: async () => [] },
    attributeValue: { aggregate: async () => ({ _max: { uint_value: null } }) },
  };
  const service = new RacksService(new RacksPrismaRepository(client(tx)));
  await assert.rejects(
    () => service.create({ name: "Rack A", row_id: 7, asset_no: "DUP" }),
    errorCode("RACK_ASSET_CONFLICT"),
  );
});

test("delete cleans both realms and protects object realm children", async () => {
  const files = [
    { entity_type: "rack", entity_id: 42 },
    { entity_type: "object", entity_id: 42 },
    { entity_type: "object", entity_id: 99 },
  ];
  const links = [
    {
      parent_entity_type: "row",
      parent_entity_id: 7,
      child_entity_type: "rack",
      child_entity_id: 42,
    },
    {
      parent_entity_type: "object",
      parent_entity_id: 99,
      child_entity_type: "object",
      child_entity_id: 42,
    },
  ];
  const tx = {
    object: { findFirst: async () => rack, delete: async () => rack },
    entityLink: {
      findFirst: async ({ where }: any) =>
        links.find(
          (link) =>
            link.parent_entity_id === where.parent_entity_id &&
            (typeof where.parent_entity_type === "string"
              ? link.parent_entity_type === where.parent_entity_type
              : where.parent_entity_type.in.includes(link.parent_entity_type)),
        ) ?? null,
      deleteMany: async ({ where }: any) => {
        for (let i = links.length - 1; i >= 0; i--) {
          if (
            (where.OR ?? [where]).some(
              (condition: any) =>
                (condition.child_entity_id === links[i].child_entity_id &&
                  (typeof condition.child_entity_type === "string"
                    ? condition.child_entity_type === links[i].child_entity_type
                    : condition.child_entity_type?.in.includes(
                        links[i].child_entity_type,
                      ))) ||
                (condition.parent_entity_id === links[i].parent_entity_id &&
                  condition.parent_entity_type?.in.includes(
                    links[i].parent_entity_type,
                  )),
            )
          )
            links.splice(i, 1);
        }
      },
    },
    fileLink: {
      deleteMany: async ({ where }: any) => {
        for (let i = files.length - 1; i >= 0; i--)
          if (
            files[i].entity_id === where.entity_id &&
            (typeof where.entity_type === "string"
              ? files[i].entity_type === where.entity_type
              : where.entity_type.in.includes(files[i].entity_type))
          )
            files.splice(i, 1);
      },
    },
    tagStorage: { deleteMany: async () => ({ count: 0 }) },
    rackSpace: {
      findFirst: async () => null,
      deleteMany: async () => ({ count: 0 }),
    },
  };
  const repository = new RacksPrismaRepository(client(tx));
  assert.deepEqual(await repository.delete(42), { status: "deleted" });
  assert.deepEqual(files, [{ entity_type: "object", entity_id: 99 }]);
  assert.deepEqual(links, []);
  links.push({
    parent_entity_type: "object",
    parent_entity_id: 42,
    child_entity_type: "object",
    child_entity_id: 88,
  });
  assert.deepEqual(await repository.delete(42), { status: "has_children" });
});

test("details preserve height for a rack with no row", async () => {
  const tx = {
    object: { findFirst: async () => rack },
    rack: { findUnique: async () => null },
    attributeValue: {
      findMany: async () => [
        { attr_id: 27, uint_value: 42 },
        { attr_id: 29, uint_value: 1 },
      ],
    },
    entityLink: { findFirst: async () => null },
  };
  const details = await new RacksPrismaRepository(client(tx)).getDetails(42);
  assert.equal(details?.row_id, null);
  assert.equal(details?.height, 42);
  assert.equal(details?.sort_order, 1);
});

test("occupancy distinguishes equipment from unavailable positions and bounds the rack height", async () => {
  const data = {
    rack_id: 42,
    rack_name: "Rack A",
    height: 4,
    spaces: [
      { unit_no: 1, state: "T", object_id: 10 },
      { unit_no: 1, state: "T", object_id: 10 },
      { unit_no: 2, state: "A", object_id: null },
      { unit_no: 3, state: "U", object_id: null },
      { unit_no: 99, state: "T", object_id: 11 },
    ],
  };
  const service = new RacksService({
    getOccupancy: async () => data,
  } as unknown as RacksRepository);
  const occupancy = await service.getOccupancy(42);
  assert.deepEqual(occupancy.occupied_units, [1]);
  assert.deepEqual(occupancy.unavailable_units, [1, 2, 3]);
  assert.deepEqual(occupancy.free_units, [4]);
});

test("occupancy list reads a bounded page using a constant number of queries", async () => {
  let reads = 0;
  let objectQuery: any;
  const tx = {
    object: {
      findMany: async (query: unknown) => {
        reads++;
        objectQuery = query;
        return [rack, { ...rack, id: 43 }];
      },
      count: async () => {
        reads++;
        return 60;
      },
    },
    attributeValue: {
      findMany: async () => {
        reads++;
        return [
          { object_id: 42, uint_value: 4 },
          { object_id: 43, uint_value: 4 },
        ];
      },
    },
    rackSpace: {
      findMany: async () => {
        reads++;
        return [];
      },
    },
  };
  const result = await new RacksService(
    new RacksPrismaRepository(client(tx)),
  ).getOccupancyAll({ page: 2, per_page: 2 });
  assert.equal(reads, 4);
  assert.equal(objectQuery.skip, 2);
  assert.equal(objectQuery.take, 2);
  assert.equal(result.total, 60);
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items[0].free_units, [1, 2, 3, 4]);
});

test("position lookup distinguishes missing rack and missing position without another read", async () => {
  let result: unknown = { status: "rack_not_found" };
  const service = new RacksService({
    getSpace: async () => result,
    get: async () => {
      throw new Error("unexpected additional query");
    },
  } as unknown as RacksRepository);
  await assert.rejects(
    () => service.getSpace(42, 1, "front"),
    errorCode("RACK_NOT_FOUND"),
  );
  result = { status: "found", space: null };
  assert.equal(await service.getSpace(42, 1, "front"), null);
});

test("invalid create data is rejected before persistence", async () => {
  const service = new RacksService({
    create: async () => {
      throw new Error("must not persist");
    },
  } as unknown as RacksRepository);
  await assert.rejects(
    () => service.create({ name: " ", row_id: 7 }),
    errorCode("INVALID_RACK_INPUT"),
  );
});

test("legacy oversized heights are rejected before building unit arrays", async () => {
  const service = new RacksService({
    getOccupancy: async () => ({
      rack_id: 42,
      rack_name: "Rack A",
      height: 1001,
      spaces: [],
    }),
  } as unknown as RacksRepository);
  await assert.rejects(
    () => service.getOccupancy(42),
    errorCode("RACK_HEIGHT_INVALID"),
  );
});

test("create and update write snapshots with the supplied actor inside their transactions", async () => {
  const events: string[] = [];
  const snapshots: unknown[] = [];
  const tx = {
    object: {
      findFirst: async ({ where }: any) =>
        where.id === 7 ? { id: 7 } : where.id === 42 ? rack : null,
      create: async () => {
        events.push("create");
        return rack;
      },
      update: async ({ data }: any) => {
        events.push("update");
        return { ...rack, name: data.name };
      },
    },
    attributeValue: {
      aggregate: async () => ({ _max: { uint_value: null } }),
      createMany: async () => {
        events.push("attributes");
      },
    },
    entityLink: {
      findMany: async () => [],
      create: async () => {
        events.push("link");
      },
    },
    objectHistory: {
      create: async ({ data }: any) => {
        events.push("history");
        snapshots.push(data);
      },
    },
  };
  const prisma = {
    $transaction: async (operation: (tx: object) => Promise<unknown>) => {
      events.push("begin");
      const result = await operation(tx);
      events.push("commit");
      return result;
    },
  } as unknown as typeof Client;
  const service = new RacksService(new RacksPrismaRepository(prisma));
  await service.create({ name: "Rack A", row_id: 7 }, "luis");
  await service.update(42, { name: "Rack B" }, "luis");
  assert.deepEqual(events, [
    "begin",
    "create",
    "attributes",
    "link",
    "history",
    "commit",
    "begin",
    "update",
    "history",
    "commit",
  ]);
  assert.deepEqual(snapshots, [
    { ...rack, user_name: "luis" },
    { ...rack, name: "Rack B", user_name: "luis" },
  ]);
});
