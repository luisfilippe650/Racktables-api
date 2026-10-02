import assert from "node:assert/strict";
import test from "node:test";
import { LocationsService } from "../../../src/modules/locations/locations.service.js";
import type { LocationsRepository } from "../../../src/modules/locations/repository/locations.repository.js";
import { LocationNotFoundError } from "../../../src/modules/locations/errors/locations.errors.js";

const location = {
  id: 7,
  name: "Room A",
  objtype_id: 1562,
  label: null,
  asset_no: null,
  has_problems: "no" as const,
  comment: null,
};

test("location creation accepts a name without a generated ID and normalizes it", async () => {
  const service = new LocationsService({
    create: async (data) => {
      assert.deepEqual(data, { name: "Room A" });
      return { status: "created", location };
    },
  } as LocationsRepository);
  assert.deepEqual(await service.create({ name: " Room A " }), location);
});

test("location listing delegates to repository and returns an empty array", async () => {
  const service = new LocationsService({
    getAll: async () => [],
  } as LocationsRepository);
  assert.deepEqual(await service.getAll(), []);
});

test("missing location reads and updates use the domain not-found error", async () => {
  const service = new LocationsService({
    get: async () => null,
    update: async () => ({ status: "not_found" }),
  } as LocationsRepository);
  await assert.rejects(() => service.get(7), LocationNotFoundError);
  await assert.rejects(
    () => service.update(7, { name: "Room A" }),
    LocationNotFoundError,
  );
});
