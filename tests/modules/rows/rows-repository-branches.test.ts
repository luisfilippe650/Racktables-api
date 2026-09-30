import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma as PrismaClientInstance } from "../../../src/database/prisma.js";
import { RowPrismaRepository } from "../../../src/modules/rows/repository/rows.prisma.js";
import { OBJECT_TYPES } from "../../../src/shared/object-types.js";

const row = {
  id: 42,
  name: "Row A",
  label: null,
  objtype_id: OBJECT_TYPES.ROW,
  asset_no: null,
  has_problems: "no" as const,
  comment: null,
};

function prismaWithTransaction(transactionClient: object) {
  return {
    ...transactionClient,
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => operation(transactionClient),
  } as unknown as typeof PrismaClientInstance;
}

test("create persists a typed row when its name is available", async () => {
  let createdData: unknown;
  const transactionClient = {
    object: {
      findFirst: async () => null,
      create: async (query: { data: unknown }) => {
        createdData = query.data;
        return row;
      },
    },
  };
  const repository = new RowPrismaRepository(
    prismaWithTransaction(transactionClient),
  );

  const result = await repository.create({ name: "Row A" });

  assert.deepEqual(createdData, {
    name: "Row A",
    objtype_id: OBJECT_TYPES.ROW,
  });
  assert.deepEqual(result, { status: "created", row });
});

test("create retries a serialization conflict and then reports the name conflict", async () => {
  let transactionCalls = 0;
  const transactionClient = {
    object: {
      findFirst: async () => row,
    },
  };
  const serializationConflict = Object.assign(new Error("write conflict"), {
    code: "P2034",
  });
  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => {
      transactionCalls += 1;

      if (transactionCalls === 1) {
        throw serializationConflict;
      }

      return operation(transactionClient);
    },
  } as unknown as typeof PrismaClientInstance;
  const repository = new RowPrismaRepository(prisma);

  const result = await repository.create({ name: "Row A" });

  assert.deepEqual(result, { status: "name_conflict" });
  assert.equal(transactionCalls, 2);
});

test("transaction conflicts use exponential backoff before retrying", async () => {
  let transactionCalls = 0;
  const delays: number[] = [];
  const serializationConflict = Object.assign(new Error("write conflict"), {
    code: "P2034",
  });
  const prisma = {
    $transaction: async () => {
      transactionCalls += 1;
      throw serializationConflict;
    },
  } as unknown as typeof PrismaClientInstance;
  const repository = new RowPrismaRepository(prisma, async (delayMs) => {
    delays.push(delayMs);
  });

  await assert.rejects(() => repository.create({ name: "Row A" }));

  assert.equal(transactionCalls, 3);
  assert.deepEqual(delays, [25, 50]);
});

test("delete reports when a row is parent of another entity", async () => {
  let deletedLinks = false;
  let deletedRow = false;
  const transactionClient = {
    object: {
      findFirst: async () => ({ id: 42 }),
      delete: async () => {
        deletedRow = true;
        return row;
      },
    },
    entityLink: {
      findFirst: async () => ({ id: 1 }),
      deleteMany: async () => {
        deletedLinks = true;
        return { count: 1 };
      },
    },
  };
  const repository = new RowPrismaRepository(
    prismaWithTransaction(transactionClient),
  );

  const result = await repository.delete(42);

  assert.deepEqual(result, { status: "has_children" });
  assert.equal(deletedLinks, false);
  assert.equal(deletedRow, false);
});

test("update reports a missing row", async () => {
  const transactionClient = {
    object: {
      findFirst: async () => null,
    },
  };
  const repository = new RowPrismaRepository(
    prismaWithTransaction(transactionClient),
  );

  const result = await repository.update({ id: 999, name: "Row B" });

  assert.deepEqual(result, { status: "not_found" });
});

test("update reports a name used by another row", async () => {
  let findCalls = 0;
  const transactionClient = {
    object: {
      findFirst: async () => {
        findCalls += 1;
        return findCalls === 1 ? { id: 42 } : { id: 43 };
      },
    },
  };
  const repository = new RowPrismaRepository(
    prismaWithTransaction(transactionClient),
  );

  const result = await repository.update({ id: 42, name: "Row B" });

  assert.deepEqual(result, { status: "name_conflict" });
});

test("getAll returns rows ordered by name", async () => {
  let receivedQuery: unknown;
  const prisma = {
    object: {
      findMany: async (query: unknown) => {
        receivedQuery = query;
        return [];
      },
    },
  } as unknown as typeof PrismaClientInstance;
  const repository = new RowPrismaRepository(prisma);

  const result = await repository.getAll();

  assert.deepEqual(result, []);
  assert.deepEqual(receivedQuery, {
    where: { objtype_id: OBJECT_TYPES.ROW },
    orderBy: { name: "asc" },
  });
});
