import assert from "node:assert/strict";
import test from "node:test";

import {
  RowSchema,
  RowLocationParamsSchema,
  RowWithLocationSchema,
  UpdateRowSchema,
} from "../../../src/modules/rows/schemas/rows.dto.js";

test("RowSchema accepts only a row name", () => {
  assert.deepEqual(RowSchema.parse({ name: "Row A" }), { name: "Row A" });
  assert.throws(() => RowSchema.parse({ name: "Row A", locationId: 7 }));
});

test("RowWithLocationSchema requires a positive location id", () => {
  assert.deepEqual(
    RowWithLocationSchema.parse({ name: "Row A", locationId: "7" }),
    { name: "Row A", locationId: 7 },
  );
  assert.throws(() => RowWithLocationSchema.parse({ name: "Row A" }));
  assert.throws(() =>
    RowWithLocationSchema.parse({ name: "Row A", locationId: 0 }),
  );
});

test("UpdateRowSchema accepts only the new row name", () => {
  assert.deepEqual(UpdateRowSchema.parse({ name: "Row B" }), {
    name: "Row B",
  });
  assert.throws(() => UpdateRowSchema.parse({ name: "Row B", locationId: 7 }));
});

test("RowLocationParamsSchema coerces positive row and location ids", () => {
  assert.deepEqual(
    RowLocationParamsSchema.parse({ rowId: "42", locationId: "7" }),
    { rowId: 42, locationId: 7 },
  );
  assert.throws(() =>
    RowLocationParamsSchema.parse({ rowId: 0, locationId: 7 }),
  );
  assert.throws(() =>
    RowLocationParamsSchema.parse({ rowId: 42, locationId: -1 }),
  );
});

test("row schemas trim names and reject whitespace-only input", () => {
  assert.deepEqual(RowSchema.parse({ name: "  Row A  " }), {
    name: "Row A",
  });
  assert.deepEqual(UpdateRowSchema.parse({ name: "  Row B  " }), {
    name: "Row B",
  });
  assert.throws(() =>
    RowWithLocationSchema.parse({ name: "   ", locationId: 7 }),
  );
});
