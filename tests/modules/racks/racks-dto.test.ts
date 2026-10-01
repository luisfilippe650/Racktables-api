import assert from "node:assert/strict";
import test from "node:test";
import { RacksSchema } from "../../../src/modules/racks/dto/racks.dto.js";

test("rack creation normalizes fields and supplies the default height", () => {
  assert.deepEqual(
    RacksSchema.parse({ name: " Rack A ", row_id: 7, asset_no: " " }),
    {
      name: "Rack A",
      row_id: 7,
      rack_height: 42,
      asset_no: null,
    },
  );
});

test("rack creation rejects invalid names, height, ids, asset numbers and extra fields", () => {
  const valid = { name: "Rack A", row_id: 7 };
  for (const data of [
    { ...valid, name: " " },
    { ...valid, name: "a".repeat(256) },
    { ...valid, row_id: 0 },
    { ...valid, row_id: "7" },
    { ...valid, rack_height: 0 },
    { ...valid, rack_height: 1.5 },
    { ...valid, rack_height: 4294967296 },
    { ...valid, asset_no: "a".repeat(65) },
    { ...valid, objtype_id: 4 },
  ])
    assert.equal(
      RacksSchema.safeParse(data).success,
      false,
      JSON.stringify(data),
    );
});

test("rack height is bounded to prevent unbounded occupancy responses", () => {
  assert.equal(
    RacksSchema.safeParse({ name: "Rack A", row_id: 7, rack_height: 1001 })
      .success,
    false,
  );
  assert.equal(
    RacksSchema.safeParse({ name: "Rack A", row_id: 7, rack_height: 1000 })
      .success,
    true,
  );
});
