import assert from "node:assert/strict";
import test from "node:test";

import { ApplicationError } from "../../../src/shared/errors/application.error.js";
import {
  RowHasChildrenError,
  RowNotFoundError,
} from "../../../src/modules/rows/errors/rows.errors.js";

test("RowNotFoundError exposes the application error contract", () => {
  const error = new RowNotFoundError(42);

  assert.ok(error instanceof Error);
  assert.ok(error instanceof ApplicationError);
  assert.equal(error.name, "RowNotFoundError");
  assert.equal(error.code, "ROW_NOT_FOUND");
  assert.equal(error.statusCode, 404);
  assert.equal(error.message, "Row 42 was not found.");
  assert.deepEqual(error.details, { rowId: 42 });
});

test("RowHasChildrenError exposes the conflict error contract", () => {
  const error = new RowHasChildrenError(42);

  assert.ok(error instanceof Error);
  assert.ok(error instanceof ApplicationError);
  assert.equal(error.name, "RowHasChildrenError");
  assert.equal(error.code, "ROW_HAS_CHILDREN");
  assert.equal(error.statusCode, 409);
  assert.equal(
    error.message,
    "Row 42 has linked entities and cannot be deleted.",
  );
  assert.deepEqual(error.details, { rowId: 42 });
});
