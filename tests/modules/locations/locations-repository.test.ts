import assert from "node:assert/strict";
import test from "node:test";
import { LocationPrismaRepository } from "../../../src/modules/locations/repository/locations.prisma.js";
import type { Prisma } from "../../../src/database/prisma.js";
import { ApplicationError } from "../../../src/shared/errors/application.error.js";

function repository(
  tx: Record<string, unknown>,
  delay: (ms: number) => Promise<void> = async () => {},
) {
  return new LocationPrismaRepository(
    {
      ...tx,
      $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
        operation(tx),
    } as unknown as typeof Prisma,
    delay,
  );
}

test("location database failures preserve their cause instead of returning null", async () => {
  const cause = new Error("synthetic database failure");
  const fail = async () => {
    throw cause;
  };
  const repo = repository({
    object: { create: fail, findFirst: fail, findMany: fail, update: fail },
  });
  for (const operation of [
    () => repo.create({ name: "Room A" }),
    () => repo.get(7),
    () => repo.getAll(),
    () => repo.update({ id: 7, name: "Room A" }),
  ]) {
    await assert.rejects(operation, (error: unknown) => {
      assert.ok(error instanceof ApplicationError);
      assert.equal(error.code, "DATABASE_ERROR");
      assert.equal(error.cause, cause);
      return true;
    });
  }
});

test("location deletion removes metadata and links before deleting the object", async () => {
  const calls: string[] = [];
  const repo = repository({
    object: {
      findFirst: async () => ({ id: 7 }),
      delete: async () => {
        calls.push("object");
      },
    },
    fileLink: {
      deleteMany: async ({ where }: any) => {
        assert.deepEqual(where, {
          entity_type: { in: ["location", "object"] },
          entity_id: 7,
        });
        calls.push("files");
      },
    },
    tagStorage: {
      deleteMany: async ({ where }: any) => {
        assert.deepEqual(where, {
          entity_realm: { in: ["location", "object"] },
          entity_id: 7,
        });
        calls.push("tags");
      },
    },
    entityLink: {
      findFirst: async () => null,
      deleteMany: async ({ where }: any) => {
        assert.deepEqual(where, {
          OR: [
            {
              parent_entity_type: { in: ["location", "object"] },
              parent_entity_id: 7,
            },
            {
              child_entity_type: { in: ["location", "object"] },
              child_entity_id: 7,
            },
          ],
        });
        calls.push("links");
      },
    },
  });
  assert.deepEqual(await repo.delete(7), { status: "deleted" });
  assert.deepEqual(calls, ["files", "tags", "links", "object"]);
});

test("location delete retries serialization conflicts with bounded delays", async () => {
  let attempts = 0;
  const delays: number[] = [];
  const repo = repository(
    {
      object: {
        findFirst: async () => {
          attempts++;
          if (attempts < 3) throw { code: "P2034" };
          return null;
        },
      },
    },
    async (ms) => {
      delays.push(ms);
    },
  );
  assert.deepEqual(await repo.delete(7), { status: "not_found" });
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [25, 50]);
});

test("location delete protects linked rows before cleanup", async () => {
  const repo = repository({
    object: { findFirst: async () => ({ id: 7 }) },
    entityLink: { findFirst: async () => ({ id: 8 }) },
  });
  assert.deepEqual(await repo.delete(7), { status: "has_rows" });
});
