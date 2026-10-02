import assert from "node:assert/strict";
import test from "node:test";
import * as dto from "../../../src/modules/objects/dto/objects.dto.js";
import * as queryDto from "../../../src/modules/objects/dto/objects-query.dto.js";
import * as placementDto from "../../../src/modules/objects/dto/objects-placement.dto.js";

test("create normalizes text and rejects infrastructure types", () => {
  assert.deepEqual(
    dto.ObjectsSchema.parse({
      name: " server ",
      objtype_id: 4,
      label: " ",
      comment: " note ",
    }),
    {
      name: "server",
      objtype_id: 4,
      label: null,
      comment: "note",
    },
  );
  for (const data of [
    { name: " ", objtype_id: 4 },
    { name: "rack", objtype_id: 1560 },
    { name: "a", objtype_id: 0 },
    { name: "a", objtype_id: 4, extra: true },
  ]) {
    assert.equal(dto.ObjectsSchema.safeParse(data).success, false);
  }
});

test("attribute updates reject immutable fields and require an explicit clear", () => {
  for (const data of [
    {},
    { id: 1 },
    { objtype_id: 4 },
    { "Height, units": 2 },
    { name: null },
    { label: 2 },
    { has_problems: "maybe" },
    { CPU: null },
    { CPU: " " },
    { CPU: { clear: false } },
  ]) {
    assert.equal(
      dto.UpdateObjectAttributesSchema.safeParse(data).success,
      false,
    );
  }
  assert.deepEqual(
    dto.UpdateObjectAttributesSchema.parse({
      name: " a ",
      has_problems: "on",
      CPU: { clear: true },
    }),
    {
      name: "a",
      has_problems: "yes",
      CPU: { clear: true },
    },
  );
});

test("mount and move require positive integer units without crossing U1", () => {
  assert.equal(
    placementDto.MountObjectSchema.safeParse({
      rack_id: 1,
      object_id: 2,
      start_unit: 2,
      height: 3,
    }).success,
    false,
  );
  assert.equal(
    placementDto.MountObjectSchema.safeParse({
      rack_id: 1,
      object_id: 2,
      start_unit: 2,
      height: 2,
    }).success,
    true,
  );
  assert.equal(
    placementDto.MoveObjectSchema.safeParse({
      object_id: 2,
      destination_rack_id: 1,
      start_unit: 0,
    }).success,
    false,
  );
});

test("mount and move reject units above the supported rack limit before persistence", () => {
  assert.equal(
    placementDto.MountObjectSchema.safeParse({
      rack_id: 7,
      object_id: 42,
      start_unit: 1001,
      height: 1,
    }).success,
    false,
  );
  assert.equal(
    placementDto.MountObjectSchema.safeParse({
      rack_id: 7,
      object_id: 42,
      start_unit: 1_000_000,
      height: 1_000_000,
    }).success,
    false,
  );
  assert.equal(
    placementDto.MoveObjectSchema.safeParse({
      object_id: 42,
      destination_rack_id: 7,
      start_unit: 1001,
    }).success,
    false,
  );
  assert.equal(
    placementDto.MountObjectSchema.safeParse({
      rack_id: 7,
      object_id: 42,
      start_unit: 1000,
      height: 1000,
    }).success,
    true,
  );
});

test("queries coerce bounded pagination and correctly parse include_options=false", () => {
  assert.deepEqual(queryDto.ObjectListQuerySchema.parse({}), {
    page: 1,
    per_page: 50,
  });
  assert.equal(
    queryDto.ObjectListQuerySchema.safeParse({ page: 1001 }).success,
    false,
  );
  assert.equal(
    queryDto.ObjectListQuerySchema.safeParse({ per_page: 101 }).success,
    false,
  );
  assert.deepEqual(
    queryDto.ObjectSummaryQuerySchema.parse({ include_options: "false" }),
    { include_options: false },
  );
  assert.deepEqual(queryDto.ObjectAllQuerySchema.parse({ search: " a " }), {
    page: 1,
    per_page: 50,
    search: "a",
  });
});
