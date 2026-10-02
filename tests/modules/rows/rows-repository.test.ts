import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma as PrismaClientInstance } from "../../../src/database/prisma.js";
import { DatabaseOperationError } from "../../../src/modules/rows/errors/rows.errors.js";
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

test("create returns null when the row name already exists", async () => {
  const transactionClient = {
    object: {
      findFirst: async () => row,
      create: async () => row,
    },
  };
  const repository = new RowPrismaRepository(
    prismaWithTransaction(transactionClient),
  );

  const result = await repository.create({ name: "Row A" });

  assert.deepEqual(result, { status: "name_conflict" });
});

test("createWithLocation creates and links a typed row atomically", async () => {
  const findQueries: unknown[] = [];
  let createdRowData: unknown;
  let createdLinkData: unknown;
  let transactionCalls = 0;

  const transactionClient = {
    object: {
      findFirst: async (query: { where: Record<string, unknown> }) => {
        findQueries.push(query);

        if (query.where.id === 7) {
          return { id: 7 };
        }

        return null;
      },
      create: async (query: { data: unknown }) => {
        createdRowData = query.data;
        return row;
      },
    },
    entityLink: {
      create: async (query: { data: unknown }) => {
        createdLinkData = query.data;
        return { id: 1, ...(query.data as object) };
      },
    },
  };

  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => {
      transactionCalls += 1;
      return operation(transactionClient);
    },
  } as unknown as typeof PrismaClientInstance;
  const repository = new RowPrismaRepository(prisma);

  const result = await repository.createWithLocation({
    name: "Row A",
    locationId: 7,
  });

  assert.equal(transactionCalls, 1);
  assert.deepEqual(findQueries, [
    {
      where: { id: 7, objtype_id: OBJECT_TYPES.LOCATION },
      select: { id: true },
    },
    {
      where: { name: "Row A", objtype_id: OBJECT_TYPES.ROW },
      select: { id: true },
    },
  ]);
  assert.deepEqual(createdRowData, {
    name: "Row A",
    objtype_id: OBJECT_TYPES.ROW,
  });
  assert.deepEqual(createdLinkData, {
    parent_entity_type: "location",
    parent_entity_id: 7,
    child_entity_type: "row",
    child_entity_id: 42,
  });
  assert.deepEqual(result, { status: "created", row });
});

test("createWithLocation returns null for a missing location", async () => {
  const transactionClient = {
    object: {
      findFirst: async () => null,
    },
  };
  const repository = new RowPrismaRepository(
    prismaWithTransaction(transactionClient),
  );

  const result = await repository.createWithLocation({
    name: "Row A",
    locationId: 999,
  });

  assert.deepEqual(result, { status: "location_not_found" });
});

test("update allows an available name and excludes the current row from conflicts", async () => {
  const findQueries: unknown[] = [];
  let updatedData: unknown;

  const transactionClient = {
    object: {
      findFirst: async (query: { where: Record<string, unknown> }) => {
        findQueries.push(query.where);

        if (query.where.id === 42) {
          return { id: 42 };
        }

        return null;
      },
      update: async (query: { data: unknown }) => {
        updatedData = query.data;
        return { ...row, name: "Row B" };
      },
    },
  };
  const repository = new RowPrismaRepository(
    prismaWithTransaction(transactionClient),
  );

  const result = await repository.update({ id: 42, name: "Row B" });

  assert.deepEqual(findQueries, [
    { id: 42, objtype_id: OBJECT_TYPES.ROW },
    {
      name: "Row B",
      objtype_id: OBJECT_TYPES.ROW,
      id: { not: 42 },
    },
  ]);
  assert.deepEqual(updatedData, { name: "Row B" });
  assert.equal(result.status, "updated");
  assert.equal(result.status === "updated" ? result.row.name : null, "Row B");
});

test("delete reports a missing row", async () => {
  const transactionClient = {
    object: {
      findFirst: async () => null,
    },
  };
  const repository = new RowPrismaRepository(
    prismaWithTransaction(transactionClient),
  );

  const result = await repository.delete(999);

  assert.deepEqual(result, { status: "not_found" });
});

test("database failures use a safe public error and preserve the cause", async () => {
  const databaseFailure = new Error("password=secret");
  const prisma = {
    object: {
      findFirst: async () => {
        throw databaseFailure;
      },
    },
  } as unknown as typeof PrismaClientInstance;
  const repository = new RowPrismaRepository(prisma);

  await assert.rejects(
    () => repository.get(42),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseOperationError);
      assert.equal(
        error.message,
        "It was not possible to complete the database operation.",
      );
      assert.equal(error.cause, databaseFailure);
      assert.equal(error.message.includes("secret"), false);
      return true;
    },
  );
});

test("getByName accepts only the row name", async () => {
  let receivedWhere: unknown;
  const prisma = {
    object: {
      findFirst: async (query: { where: unknown }) => {
        receivedWhere = query.where;
        return row;
      },
    },
  } as unknown as typeof PrismaClientInstance;
  const repository = new RowPrismaRepository(prisma);

  await repository.getByName("Row A");

  assert.deepEqual(receivedWhere, {
    name: "Row A",
    objtype_id: OBJECT_TYPES.ROW,
  });
});
