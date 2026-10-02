import assert from "node:assert/strict";
import test from "node:test";
import { RowService } from "../../src/modules/rows/rows.service.js";
import type { RowRepository } from "../../src/modules/rows/repository/rows.repository.js";
import { LocationsService } from "../../src/modules/locations/locations.service.js";
import type { LocationsRepository } from "../../src/modules/locations/repository/locations.repository.js";
import { ApplicationError } from "../../src/shared/errors/application.error.js";

function invalidInput(error: unknown): boolean {
  assert.ok(error instanceof ApplicationError);
  assert.equal(error.statusCode, 400);
  assert.ok(Array.isArray(error.details?.issues));
  return true;
}

test("rows rejects malformed inputs before reaching persistence", async () => {
  const service = new RowService({} as RowRepository);
  await assert.rejects(() => service.create({ name: " " }), invalidInput);
  await assert.rejects(
    () => service.createWithLocation({ name: "A", locationId: 0 }),
    invalidInput,
  );
  await assert.rejects(() => service.update(1, { name: " " }), invalidInput);
  await assert.rejects(() => service.update(0, { name: "A" }), invalidInput);
  await assert.rejects(() => service.delete(0), invalidInput);
  await assert.rejects(() => service.get(0), invalidInput);
  await assert.rejects(() => service.getByName(" "), invalidInput);
  await assert.rejects(() => service.linkToLocation(1, 0), invalidInput);
  await assert.rejects(() => service.unlinkFromLocation(0, 1), invalidInput);
});

test("rows uses normalized names from validation", async () => {
  const service = new RowService({
    create: async (data) => {
      assert.equal(data.name, "Row A");
      return { status: "name_conflict" };
    },
  } as RowRepository);
  await assert.rejects(
    () => service.create({ name: " Row A " }),
    (error: unknown) => {
      assert.ok(error instanceof ApplicationError);
      assert.deepEqual(error.details, { rowName: "Row A" });
      return true;
    },
  );
});

test("locations rejects malformed inputs before reaching persistence", async () => {
  const service = new LocationsService({} as LocationsRepository);
  await assert.rejects(() => service.create({ name: "" }), invalidInput);
  await assert.rejects(() => service.create({ name: " " }), invalidInput);
  await assert.rejects(() => service.update(0, { name: "A" }), invalidInput);
  await assert.rejects(() => service.update(1, { name: "" }), invalidInput);
  await assert.rejects(() => service.delete(0), invalidInput);
  await assert.rejects(() => service.get(0), invalidInput);
});

test("locations validates the complete update payload", async () => {
  const service = new LocationsService({} as LocationsRepository);
  await assert.rejects(
    () => service.update(1, null as unknown as { name: string }),
    invalidInput,
  );
  await assert.rejects(
    () => service.update(1, { name: "A", extra: true } as { name: string }),
    invalidInput,
  );
});
