import assert from "node:assert/strict";
import test from "node:test";
import { RowPrismaRepository } from "../../src/modules/rows/repository/rows.prisma.js";
import { RacksPrismaRepository } from "../../src/modules/racks/repository/racks.prisma.js";
import { ObjectsPrismaRepository } from "../../src/modules/objects/repository/objects.prisma.js";
import { LocationPrismaRepository } from "../../src/modules/locations/repository/locations.prisma.js";
import type { Prisma } from "../../src/database/prisma.js";
import { ApplicationError } from "../../src/shared/errors/application.error.js";

function invalid(error: unknown): boolean {
  assert.ok(error instanceof ApplicationError);
  assert.equal(error.statusCode, 400);
  assert.ok(Array.isArray(error.details?.issues));
  return true;
}

const disconnected = {} as typeof Prisma;
const rows = new RowPrismaRepository(disconnected);
const racks = new RacksPrismaRepository(disconnected);
const objects = new ObjectsPrismaRepository(disconnected);
const locations = new LocationPrismaRepository(disconnected);

for (const [name, repository] of [
  ["rows", rows],
  ["racks", racks],
  ["objects", objects],
  ["locations", locations],
] as const) {
  test(`${name} rejects invalid repository IDs with validation details before database access`, async () => {
    await assert.rejects(() => repository.get(0), invalid);
    await assert.rejects(() => repository.delete(0), invalid);
  });
}

test("rows and racks reject malformed write inputs before database access", async () => {
  await assert.rejects(() => rows.create({ name: " " }), invalid);
  await assert.rejects(() => rows.update({ id: 1, name: " " }), invalid);
  await assert.rejects(() => rows.linkToLocation(0, 1), invalid);
  await assert.rejects(
    () => racks.create({ name: "R", row_id: 0, rack_height: 42 }),
    invalid,
  );
  await assert.rejects(() => racks.update({ id: 1, name: " " }), invalid);
  await assert.rejects(
    () => racks.getAll({ page: 1, per_page: 1000 }),
    invalid,
  );
});

test("object lookup validates names and the service tag length before database access", async () => {
  await assert.rejects(() => objects.getByName(" "), invalid);
  await assert.rejects(() => objects.getByServiceTag("x".repeat(65)), invalid);
});

test("object summaries validate option flags before database access", async () => {
  await assert.rejects(
    () => objects.getSummary(1, "invalid" as unknown as boolean),
    invalid,
  );
});

test("object summaries normalize false option flags instead of treating them as truthy", async () => {
  const tx = {
    object: {
      findUnique: async () => ({
        id: 1,
        objtype_id: 4,
        name: "Server",
        label: null,
        asset_no: null,
        has_problems: "no",
        comment: null,
      }),
    },
    rackSpace: { findMany: async () => [] },
    attributeMap: {
      findMany: async () => [
        {
          attr_id: 1,
          chapter_id: 11,
          Attribute: { name: "Model", type: "dict" },
        },
      ],
    },
    attributeValue: { findMany: async () => [] },
    dictionary: {
      findMany: async () => {
        throw new Error("Options must not be loaded when disabled.");
      },
    },
  };
  const repo = new ObjectsPrismaRepository({
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
      operation(tx),
  } as unknown as typeof Prisma);
  const summary = await repo.getSummary(1, "false" as unknown as boolean);
  assert.deepEqual(summary?.attributes.Model, { value: null });
});
