import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma as PrismaClientInstance } from "../../../src/database/prisma.js";
import { RowPrismaRepository } from "../../../src/modules/rows/repository/rows.prisma.js";

test("delete removes incoming row links without looking them up first", async () => {
  const operations: string[] = [];
  let fileLinkDeleteQuery: unknown;
  let tagStorageDeleteQuery: unknown;

  const transactionClient = {
    object: {
      findFirst: async () => ({ id: 42 }),
      delete: async () => {
        operations.push("delete-row");
        return { id: 42 };
      },
    },
    entityLink: {
      findFirst: async () => {
        operations.push("find-parent-link");

        if (
          operations.filter((operation) => operation === "find-parent-link")
            .length > 1
        ) {
          throw new Error("Unexpected lookup of incoming links");
        }

        return null;
      },
      deleteMany: async () => {
        operations.push("delete-incoming-links");
        return { count: 0 };
      },
    },
    fileLink: {
      deleteMany: async (query: unknown) => {
        fileLinkDeleteQuery = query;
        operations.push("delete-file-links");
        return { count: 1 };
      },
    },
    tagStorage: {
      deleteMany: async (query: unknown) => {
        tagStorageDeleteQuery = query;
        operations.push("delete-tags");
        return { count: 1 };
      },
    },
  };

  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => operation(transactionClient),
  } as unknown as typeof PrismaClientInstance;

  const repository = new RowPrismaRepository(prisma);

  await repository.delete(42);

  assert.deepEqual(operations, [
    "find-parent-link",
    "delete-file-links",
    "delete-tags",
    "delete-incoming-links",
    "delete-row",
  ]);
  assert.deepEqual(fileLinkDeleteQuery, {
    where: { entity_type: "row", entity_id: 42 },
  });
  assert.deepEqual(tagStorageDeleteQuery, {
    where: { entity_realm: "object", entity_id: 42 },
  });
});
