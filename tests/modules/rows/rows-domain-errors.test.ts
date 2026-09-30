import assert from "node:assert/strict";
import test from "node:test";

import {
  LocationNotFoundError,
  RowNameConflictError,
} from "../../../src/modules/rows/errors/rows.errors.js";

test("RowNameConflictError represents an HTTP conflict", () => {
  const error = new RowNameConflictError("Row A");

  assert.equal(error.code, "ROW_NAME_CONFLICT");
  assert.equal(error.statusCode, 409);
  assert.deepEqual(error.details, { rowName: "Row A" });
});

test("LocationNotFoundError identifies the missing location", () => {
  const error = new LocationNotFoundError(7);

  assert.equal(error.code, "LOCATION_NOT_FOUND");
  assert.equal(error.statusCode, 404);
  assert.deepEqual(error.details, { locationId: 7 });
});
