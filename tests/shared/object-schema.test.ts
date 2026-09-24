import assert from "node:assert/strict";
import test from "node:test";

import {
  ObjectFieldsSchema,
  ObjectIdParamsSchema,
  ObjectIdSchema,
} from "../../src/shared/schemas/object.schema.js";

test("ObjectFieldsSchema accepts the common RackTables object fields", () => {
  const result = ObjectFieldsSchema.parse({
    name: "Datacenter A",
    label: "DC-A",
    asset_no: "ASSET-42",
    has_problems: "no",
    comment: "Primary site",
  });

  assert.deepEqual(result, {
    name: "Datacenter A",
    label: "DC-A",
    asset_no: "ASSET-42",
    has_problems: "no",
    comment: "Primary site",
  });
});

test("ObjectFieldsSchema rejects an empty object name", () => {
  assert.throws(() => ObjectFieldsSchema.parse({ name: "" }));
});

test("ObjectFieldsSchema rejects fields outside the object contract", () => {
  assert.throws(() =>
    ObjectFieldsSchema.parse({ name: "Datacenter A", unexpected: true }),
  );
});

test("ObjectIdSchema coerces a route parameter to a positive integer", () => {
  assert.equal(ObjectIdSchema.parse("42"), 42);
  assert.throws(() => ObjectIdSchema.parse("0"));
});

test("ObjectIdParamsSchema validates the shared id parameter", () => {
  assert.deepEqual(ObjectIdParamsSchema.parse({ id: "42" }), { id: 42 });
  assert.throws(() => ObjectIdParamsSchema.parse({ id: "42", extra: true }));
});
