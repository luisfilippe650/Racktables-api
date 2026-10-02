import assert from "node:assert/strict";
import test from "node:test";

import {
  LocationNotFoundError,
  RowHasChildrenError,
  RowNameConflictError,
  RowNotFoundError,
} from "../../../src/modules/rows/errors/rows.errors.js";
import type { RowRepository } from "../../../src/modules/rows/repository/rows.repository.js";
import { RowService } from "../../../src/modules/rows/rows.service.js";
import { ApplicationError } from "../../../src/shared/errors/application.error.js";

const row = {
  id: 42,
  name: "Row A",
  label: null,
  objtype_id: 1561,
  asset_no: null,
  has_problems: "no" as const,
  comment: null,
};

test("RowService applies business rules before persistence", async () => {
  const repository = {
    create: async () => ({ status: "name_conflict" as const }),
    createWithLocation: async () => ({ status: "location_not_found" as const }),
    delete: async () => ({ status: "has_children" as const }),
    update: async () => ({ status: "not_found" as const }),
    get: async (id: number) => (id === 42 ? row : null),
    getByName: async () => row,
    getAll: async () => [],
  } as unknown as RowRepository;
  const service = new RowService(repository);

  await assert.rejects(
    () => service.create({ name: "Row A" }),
    RowNameConflictError,
  );
  await assert.rejects(
    () => service.createWithLocation({ name: "Row A", locationId: 7 }),
    LocationNotFoundError,
  );
  await assert.rejects(() => service.delete(42), RowHasChildrenError);
  await assert.rejects(
    () => service.update(999, { name: "Row B" }),
    RowNotFoundError,
  );
  await assert.rejects(() => service.get(999), RowNotFoundError);
});

test("createWithLocation maps the atomic repository result without preliminary reads", async () => {
  const repository = {
    createWithLocation: async () => ({ status: "location_not_found" as const }),
    getByName: async () => {
      throw new Error("unexpected preliminary name lookup");
    },
  } as unknown as RowRepository;
  const service = new RowService(repository);

  await assert.rejects(
    () => service.createWithLocation({ name: "Row A", locationId: 7 }),
    LocationNotFoundError,
  );
});

test("create maps the atomic name-conflict result without a preliminary read", async () => {
  const repository = {
    create: async () => ({ status: "name_conflict" as const }),
    getByName: async () => {
      throw new Error("unexpected preliminary name lookup");
    },
  } as unknown as RowRepository;
  const service = new RowService(repository);

  await assert.rejects(
    () => service.create({ name: "Row A" }),
    RowNameConflictError,
  );
});

test("update maps the atomic not-found result without preliminary reads", async () => {
  const repository = {
    update: async () => ({ status: "not_found" as const }),
    get: async () => {
      throw new Error("unexpected preliminary id lookup");
    },
    getByName: async () => {
      throw new Error("unexpected preliminary name lookup");
    },
  } as unknown as RowRepository;
  const service = new RowService(repository);

  await assert.rejects(
    () => service.update(999, { name: "Row B" }),
    RowNotFoundError,
  );
});

test("delete maps the atomic children result without preliminary reads", async () => {
  const repository = {
    delete: async () => ({ status: "has_children" as const }),
    get: async () => {
      throw new Error("unexpected preliminary id lookup");
    },
  } as unknown as RowRepository;
  const service = new RowService(repository);

  await assert.rejects(() => service.delete(42), RowHasChildrenError);
});

test("linkToLocation treats a new link and an existing identical link as success", async () => {
  const statuses = ["linked", "already_linked"] as const;
  const receivedIds: Array<[number, number]> = [];
  const repository = {
    linkToLocation: async (rowId: number, locationId: number) => {
      receivedIds.push([rowId, locationId]);
      return { status: statuses[receivedIds.length - 1] };
    },
  } as unknown as RowRepository;
  const service = new RowService(repository);

  await service.linkToLocation(42, 7);
  await service.linkToLocation(42, 7);

  assert.deepEqual(receivedIds, [
    [42, 7],
    [42, 7],
  ]);
});

test("linkToLocation maps repository failures to application errors", async () => {
  const cases = [
    {
      result: { status: "row_not_found" as const },
      code: "ROW_NOT_FOUND",
      statusCode: 404,
      details: { rowId: 42 },
    },
    {
      result: { status: "location_not_found" as const },
      code: "LOCATION_NOT_FOUND",
      statusCode: 404,
      details: { locationId: 7 },
    },
    {
      result: { status: "location_conflict" as const, locationId: 8 },
      code: "ROW_LOCATION_CONFLICT",
      statusCode: 409,
      details: {
        rowId: 42,
        currentLocationId: 8,
        requestedLocationId: 7,
      },
    },
  ];

  for (const expected of cases) {
    const repository = {
      linkToLocation: async () => expected.result,
    } as unknown as RowRepository;
    const service = new RowService(repository);

    await assert.rejects(
      () => service.linkToLocation(42, 7),
      (error: unknown) => {
        assert.ok(error instanceof ApplicationError);
        assert.equal(error.code, expected.code);
        assert.equal(error.statusCode, expected.statusCode);
        assert.deepEqual(error.details, expected.details);
        return true;
      },
    );
  }
});

test("unlinkFromLocation returns after the repository removes the link", async () => {
  const receivedIds: Array<[number, number]> = [];
  const repository = {
    unlinkFromLocation: async (rowId: number, locationId: number) => {
      receivedIds.push([rowId, locationId]);
      return { status: "unlinked" as const };
    },
  } as unknown as RowRepository;
  const service = new RowService(repository);

  await service.unlinkFromLocation(42, 7);

  assert.deepEqual(receivedIds, [[42, 7]]);
});

test("unlinkFromLocation maps repository failures to application errors", async () => {
  const cases = [
    {
      status: "row_not_found" as const,
      code: "ROW_NOT_FOUND",
      statusCode: 404,
      details: { rowId: 42 },
    },
    {
      status: "location_not_found" as const,
      code: "LOCATION_NOT_FOUND",
      statusCode: 404,
      details: { locationId: 7 },
    },
    {
      status: "link_not_found" as const,
      code: "ROW_LOCATION_LINK_NOT_FOUND",
      statusCode: 404,
      details: { rowId: 42, locationId: 7 },
    },
    {
      status: "has_children" as const,
      code: "ROW_HAS_CHILDREN",
      statusCode: 409,
      details: { rowId: 42 },
      message: "Row 42 cannot be unlinked while it has linked entities.",
    },
  ];

  for (const expected of cases) {
    const repository = {
      unlinkFromLocation: async () => ({ status: expected.status }),
    } as unknown as RowRepository;
    const service = new RowService(repository);

    await assert.rejects(
      () => service.unlinkFromLocation(42, 7),
      (error: unknown) => {
        assert.ok(error instanceof ApplicationError);
        assert.equal(error.code, expected.code);
        assert.equal(error.statusCode, expected.statusCode);
        assert.deepEqual(error.details, expected.details);
        if (expected.message) {
          assert.equal(error.message, expected.message);
        }
        return true;
      },
    );
  }
});
