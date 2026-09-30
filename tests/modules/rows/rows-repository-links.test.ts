import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma as PrismaClientInstance } from "../../../src/database/prisma.js";
import { RowPrismaRepository } from "../../../src/modules/rows/repository/rows.prisma.js";
import { OBJECT_TYPES } from "../../../src/shared/object-types.js";

test("linkToLocation links an existing row to an existing location", async () => {
  const findQueries: unknown[] = [];
  let createdLink: unknown;
  let transactionOptions: unknown;

  const transactionClient = {
    object: {
      findFirst: async (query: unknown) => {
        findQueries.push(query);
        return { id: findQueries.length === 1 ? 42 : 7 };
      },
    },
    entityLink: {
      findMany: async () => [],
      create: async (query: { data: unknown }) => {
        createdLink = query.data;
        return { id: 1 };
      },
    },
  };
  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
      options: unknown,
    ) => {
      transactionOptions = options;
      return operation(transactionClient);
    },
  } as unknown as typeof PrismaClientInstance;
  const repository = new RowPrismaRepository(prisma);

  const result = await repository.linkToLocation(42, 7);

  assert.deepEqual(result, { status: "linked" });
  assert.deepEqual(findQueries, [
    {
      where: { id: 42, objtype_id: OBJECT_TYPES.ROW },
      select: { id: true },
    },
    {
      where: { id: 7, objtype_id: OBJECT_TYPES.LOCATION },
      select: { id: true },
    },
  ]);
  assert.deepEqual(createdLink, {
    parent_entity_type: "location",
    parent_entity_id: 7,
    child_entity_type: "row",
    child_entity_id: 42,
  });
  assert.deepEqual(transactionOptions, { isolationLevel: "Serializable" });
});

test("linkToLocation reports a missing row without creating a link", async () => {
  let linkCreated = false;
  const transactionClient = {
    object: { findFirst: async () => null },
    entityLink: {
      findMany: async () => [],
      create: async () => {
        linkCreated = true;
      },
    },
  };
  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => operation(transactionClient),
  } as unknown as typeof PrismaClientInstance;

  const result = await new RowPrismaRepository(prisma).linkToLocation(42, 7);

  assert.deepEqual(result, { status: "row_not_found" });
  assert.equal(linkCreated, false);
});

test("linkToLocation reports a missing location without creating a link", async () => {
  let findCalls = 0;
  let linkCreated = false;
  const transactionClient = {
    object: {
      findFirst: async () => {
        findCalls += 1;
        return findCalls === 1 ? { id: 42 } : null;
      },
    },
    entityLink: {
      findMany: async () => [],
      create: async () => {
        linkCreated = true;
      },
    },
  };
  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => operation(transactionClient),
  } as unknown as typeof PrismaClientInstance;

  const result = await new RowPrismaRepository(prisma).linkToLocation(42, 7);

  assert.deepEqual(result, { status: "location_not_found" });
  assert.equal(linkCreated, false);
});

test("linkToLocation is idempotent for the same location", async () => {
  let linkCreated = false;
  const transactionClient = {
    object: { findFirst: async () => ({ id: 1 }) },
    entityLink: {
      findMany: async () => [{ parent_entity_id: 7 }],
      create: async () => {
        linkCreated = true;
      },
    },
  };
  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => operation(transactionClient),
  } as unknown as typeof PrismaClientInstance;

  const result = await new RowPrismaRepository(prisma).linkToLocation(42, 7);

  assert.deepEqual(result, { status: "already_linked" });
  assert.equal(linkCreated, false);
});

test("linkToLocation rejects a row linked to another location", async () => {
  let linkCreated = false;
  const transactionClient = {
    object: { findFirst: async () => ({ id: 1 }) },
    entityLink: {
      findMany: async () => [{ parent_entity_id: 7 }, { parent_entity_id: 8 }],
      create: async () => {
        linkCreated = true;
      },
    },
  };
  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => operation(transactionClient),
  } as unknown as typeof PrismaClientInstance;

  const result = await new RowPrismaRepository(prisma).linkToLocation(42, 7);

  assert.deepEqual(result, { status: "location_conflict", locationId: 8 });
  assert.equal(linkCreated, false);
});

test("unlinkFromLocation removes only the requested row-location link", async () => {
  let deletedQuery: unknown;
  let transactionOptions: unknown;
  const transactionClient = {
    object: { findFirst: async () => ({ id: 1 }) },
    entityLink: {
      findFirst: async (query: { where: { parent_entity_type: string } }) =>
        query.where.parent_entity_type === "location" ? { id: 11 } : null,
      deleteMany: async (query: unknown) => {
        deletedQuery = query;
        return { count: 1 };
      },
    },
  };
  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
      options: unknown,
    ) => {
      transactionOptions = options;
      return operation(transactionClient);
    },
  } as unknown as typeof PrismaClientInstance;

  const result = await new RowPrismaRepository(prisma).unlinkFromLocation(
    42,
    7,
  );

  assert.deepEqual(result, { status: "unlinked" });
  assert.deepEqual(deletedQuery, {
    where: {
      parent_entity_type: "location",
      parent_entity_id: 7,
      child_entity_type: "row",
      child_entity_id: 42,
    },
  });
  assert.deepEqual(transactionOptions, { isolationLevel: "Serializable" });
});

test("unlinkFromLocation reports a missing row without deleting links", async () => {
  let linkDeleted = false;
  const transactionClient = {
    object: { findFirst: async () => null },
    entityLink: {
      findFirst: async () => null,
      deleteMany: async () => {
        linkDeleted = true;
      },
    },
  };
  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => operation(transactionClient),
  } as unknown as typeof PrismaClientInstance;

  const result = await new RowPrismaRepository(prisma).unlinkFromLocation(
    42,
    7,
  );

  assert.deepEqual(result, { status: "row_not_found" });
  assert.equal(linkDeleted, false);
});

test("unlinkFromLocation reports a missing location without deleting links", async () => {
  let findCalls = 0;
  let linkDeleted = false;
  const transactionClient = {
    object: {
      findFirst: async () => {
        findCalls += 1;
        return findCalls === 1 ? { id: 42 } : null;
      },
    },
    entityLink: {
      findFirst: async () => null,
      deleteMany: async () => {
        linkDeleted = true;
      },
    },
  };
  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => operation(transactionClient),
  } as unknown as typeof PrismaClientInstance;

  const result = await new RowPrismaRepository(prisma).unlinkFromLocation(
    42,
    7,
  );

  assert.deepEqual(result, { status: "location_not_found" });
  assert.equal(linkDeleted, false);
});

test("unlinkFromLocation reports when the requested link does not exist", async () => {
  let linkDeleted = false;
  const transactionClient = {
    object: { findFirst: async () => ({ id: 1 }) },
    entityLink: {
      findFirst: async () => null,
      deleteMany: async () => {
        linkDeleted = true;
      },
    },
  };
  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => operation(transactionClient),
  } as unknown as typeof PrismaClientInstance;

  const result = await new RowPrismaRepository(prisma).unlinkFromLocation(
    42,
    7,
  );

  assert.deepEqual(result, { status: "link_not_found" });
  assert.equal(linkDeleted, false);
});

test("unlinkFromLocation preserves the location link while the row has children", async () => {
  let linkLookupCalls = 0;
  let linkDeleted = false;
  const transactionClient = {
    object: { findFirst: async () => ({ id: 1 }) },
    entityLink: {
      findFirst: async () => {
        linkLookupCalls += 1;
        return linkLookupCalls === 1 ? { id: 11 } : { id: 12 };
      },
      deleteMany: async () => {
        linkDeleted = true;
      },
    },
  };
  const prisma = {
    $transaction: async (
      operation: (tx: typeof transactionClient) => Promise<unknown>,
    ) => operation(transactionClient),
  } as unknown as typeof PrismaClientInstance;

  const result = await new RowPrismaRepository(prisma).unlinkFromLocation(
    42,
    7,
  );

  assert.deepEqual(result, { status: "has_children" });
  assert.equal(linkDeleted, false);
});
