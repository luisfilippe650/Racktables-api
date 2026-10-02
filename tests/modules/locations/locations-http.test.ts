import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { LocationsController } from "../../../src/modules/locations/locations.controller.js";
import { LocationsService } from "../../../src/modules/locations/locations.service.js";
import type { LocationsRepository } from "../../../src/modules/locations/repository/locations.repository.js";
import { registerErrorHandler } from "../../../src/shared/errors/error-handler.js";

const location = {
  id: 7,
  name: "Room A",
  objtype_id: 1562,
  label: null,
  asset_no: null,
  has_problems: "no" as const,
  comment: null,
};

test("location HTTP consumers use standardized methods and mutation statuses", async (t) => {
  const controller = new LocationsController(
    new LocationsService({
      create: async (data) => ({
        status: "created",
        location: { ...location, name: data.name },
      }),
      update: async (data) => ({
        status: "updated",
        location: { ...location, name: data.name },
      }),
      delete: async () => ({ status: "deleted" }),
      get: async (id) => (id === 7 ? location : null),
      getAll: async () => [],
    } as LocationsRepository),
  );
  const app = Fastify();
  registerErrorHandler(app);
  app.post("/location", (request, reply) => controller.create(request, reply));
  app.patch("/location/:id", (request, reply) =>
    controller.update(request, reply),
  );
  app.delete("/location/:id", (request, reply) =>
    controller.delete(request, reply),
  );
  app.get("/location/:id", (request, reply) => controller.get(request, reply));
  app.get("/locations", (request, reply) => controller.getAll(request, reply));
  t.after(() => app.close());
  const created = await app.inject({
    method: "POST",
    url: "/location",
    payload: { name: " Room A " },
  });
  assert.equal(created.statusCode, 201);
  assert.deepEqual(created.json(), location);
  const updated = await app.inject({
    method: "PATCH",
    url: "/location/7",
    payload: { name: " Room B " },
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().name, "Room B");
  const list = await app.inject({ method: "GET", url: "/locations" });
  assert.equal(list.statusCode, 200);
  assert.deepEqual(list.json(), []);
  const absent = await app.inject({ method: "GET", url: "/location/8" });
  assert.equal(absent.statusCode, 404);
  assert.equal(absent.json().code, "LOCATION_NOT_FOUND");
  const deleted = await app.inject({ method: "DELETE", url: "/location/7" });
  assert.equal(deleted.statusCode, 204);
});
