import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import * as router from "../../../src/modules/objects/objects.router.js";
import type { ObjectsRepository } from "../../../src/modules/objects/repository/objects.repository.js";
import { registerErrorHandler } from "../../../src/shared/errors/error-handler.js";
import { DatabaseOperationError } from "../../../src/modules/objects/errors/objects.errors.js";
import { buildApp } from "../../../src/server.js";

const object = {
  id: 42,
  name: "server",
  label: null,
  asset_no: null,
  objtype_id: 4,
  has_problems: "no" as const,
  comment: null,
};

function appWith(repository: Partial<ObjectsRepository>) {
  const app = Fastify();
  registerErrorHandler(app);
  app.register(router.objectsRouter, {
    repository: repository as ObjectsRepository,
  });
  return app;
}

test("HTTP create, update and delete use normalized inputs and the expected statuses", async (t) => {
  let stored = object;
  const received: unknown[] = [];
  const app = appWith({
    create: async (data, actor) => {
      received.push({ data, actor });
      return { status: "created", object: stored, ports_created: 3 };
    },
    update: async (data, actor) => {
      received.push({ data, actor });
      stored = { ...object, name: String(data.updates.name) };
      return {
        status: "updated",
        object: stored,
        fixed_fields_updated: ["name"],
        dynamic_attributes_updated: 0,
      };
    },
    delete: async (id, actor) => {
      received.push({ id, actor });
      return { status: "deleted", object_id: id, objtype_id: 4 };
    },
  });
  t.after(() => app.close());
  const create = await app.inject({
    method: "POST",
    url: "/object",
    payload: { name: " server ", objtype_id: 4, label: " " },
  });
  assert.equal(create.statusCode, 201);
  assert.deepEqual(create.json(), { object, ports_created: 3 });
  const update = await app.inject({
    method: "PATCH",
    url: "/object/42",
    payload: { name: " renamed " },
  });
  assert.equal(update.statusCode, 200);
  assert.deepEqual(update.json(), {
    object: { ...object, name: "renamed" },
    fixed_fields_updated: ["name"],
    dynamic_attributes_updated: 0,
  });
  const deleted = await app.inject({ method: "DELETE", url: "/object/42" });
  assert.equal(deleted.statusCode, 204);
  assert.equal(deleted.body, "");
  assert.deepEqual(received, [
    { data: { name: "server", objtype_id: 4, label: null }, actor: null },
    { data: { id: 42, updates: { name: "renamed" } }, actor: null },
    { id: 42, actor: null },
  ]);
});

test("HTTP rejects invalid bodies, params and queries before any repository operation", async (t) => {
  const app = appWith({});
  t.after(() => app.close());
  for (const request of [
    { method: "POST", url: "/object", payload: { name: " ", objtype_id: 4 } },
    { method: "PATCH", url: "/object/42", payload: { id: 43 } },
    { method: "DELETE", url: "/object/0" },
    { method: "GET", url: "/object/bad" },
    { method: "GET", url: "/objects?per_page=101" },
    { method: "GET", url: "/objects/all?extra=x" },
    { method: "GET", url: "/object/by-name?name=%20" },
    { method: "GET", url: "/object/by-service-tag?service_tag=%20" },
    { method: "GET", url: "/objects/types?page=0" },
    { method: "GET", url: "/object/42/summary?include_options=invalid" },
    { method: "GET", url: "/objects/dictionary/0" },
    {
      method: "POST",
      url: "/object/mount",
      payload: { object_id: 42, rack_id: 7, start_unit: 1, height: 2 },
    },
    { method: "DELETE", url: "/object/0/mount" },
    {
      method: "POST",
      url: "/object/move",
      payload: { object_id: 42, destination_rack_id: 7, start_unit: 0 },
    },
  ] as const) {
    const response = await app.inject(request);
    assert.equal(
      response.statusCode,
      400,
      `${request.method} ${request.url}: ${response.body}`,
    );
    assert.equal(response.json().code, "INVALID_OBJECT_INPUT");
  }
});

test("all read routes reach the correct operation with normalized filters", async (t) => {
  const page = { page: 2, per_page: 10, items: [], total: 0 };
  const summary = {
    object_id: 42,
    common_name: "server",
    visible_label: null,
    asset_tag: null,
    has_problems: "no" as const,
    comment: null,
    is_allocated: false,
    row_name: null,
    location_name: null,
    rack_id: null,
    rack_name: null,
    rack_count: 0,
    allocation_status: "not_allocated" as const,
    attributes: {},
  };
  const app = appWith({
    get: async (id) => {
      assert.equal(id, 42);
      return object;
    },
    getByName: async (name) => {
      assert.equal(name, "server");
      return { status: "found", object };
    },
    getByServiceTag: async (tag) => {
      assert.equal(tag, "tag");
      return { status: "found", object };
    },
    getAll: async (query) => {
      assert.deepEqual(query, { page: 2, per_page: 10 });
      return page;
    },
    getAllObjects: async (query) => {
      assert.deepEqual(query, { page: 2, per_page: 10, search: "Dell" });
      return page;
    },
    getTypes: async (query) => {
      assert.deepEqual(query, { page: 2, per_page: 10 });
      return page;
    },
    getSummary: async (id, include) => {
      assert.equal(id, 42);
      assert.equal(include, false);
      return summary;
    },
    getDictionaryOptions: async (id, query) => {
      assert.equal(id, 11);
      assert.deepEqual(query, { page: 2, per_page: 10 });
      return page;
    },
  });
  t.after(() => app.close());
  for (const [url, expected] of [
    ["/object/42", object],
    ["/object/by-name?name=%20server%20", object],
    ["/object/by-service-tag?service_tag=%20tag%20", object],
    ["/objects?page=2&per_page=10", page],
    ["/objects/all?page=2&per_page=10&search=%20Dell%20", page],
    ["/objects/types?page=2&per_page=10", page],
    ["/object/42/summary?include_options=false", summary],
    ["/objects/dictionary/11?page=2&per_page=10", page],
  ] as const) {
    const response = await app.inject(url);
    assert.equal(response.statusCode, 200, `${url}: ${response.body}`);
    assert.deepEqual(response.json(), expected);
  }
});

test("mount, unmount and move routes expose allocation results", async (t) => {
  const mount = {
    rack_id: 7,
    object_id: 42,
    start_unit: 10,
    height: 1,
    end_unit: 10,
    molecule_id: 99,
  };
  const unmount = {
    object_id: 42,
    rack_id: 7,
    units_removed: [10],
    molecule_id: 100,
  };
  const move = {
    object_id: 42,
    destination_rack_id: 8,
    start_unit: 20,
    source_rack_id: 7,
    end_unit: 20,
    height: 1,
    old_molecule_id: 100,
    new_molecule_id: 101,
  };
  const app = appWith({
    mount: async (data) => {
      assert.deepEqual(data, {
        rack_id: 7,
        object_id: 42,
        start_unit: 10,
        height: 1,
      });
      return { status: "mounted", allocation: mount };
    },
    unmount: async (id) => {
      assert.equal(id, 42);
      return { status: "unmounted", allocation: unmount };
    },
    move: async (data) => {
      assert.deepEqual(data, {
        object_id: 42,
        destination_rack_id: 8,
        start_unit: 20,
      });
      return { status: "moved", allocation: move };
    },
  });
  t.after(() => app.close());
  const mounted = await app.inject({
    method: "POST",
    url: "/object/mount",
    payload: { rack_id: 7, object_id: 42, start_unit: 10, height: 1 },
  });
  const moved = await app.inject({
    method: "POST",
    url: "/object/move",
    payload: { object_id: 42, destination_rack_id: 8, start_unit: 20 },
  });
  const unmounted = await app.inject({
    method: "DELETE",
    url: "/object/42/mount",
  });
  for (const [response, expected] of [
    [mounted, mount],
    [moved, move],
    [unmounted, unmount],
  ] as const) {
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), expected);
  }
});

test("HTTP domain errors preserve actionable details and missing/ambiguous lookups", async (t) => {
  const mountedIn = [
    { rack_id: 7, rack_name: "rack", start_unit: 10, end_unit: 10, height: 1 },
  ];
  const app = appWith({
    create: async () => ({ status: "name_conflict" }),
    get: async () => null,
    getByName: async () => ({ status: "ambiguous" }),
    getByServiceTag: async () => ({ status: "not_found" }),
    getSummary: async () => null,
    getDictionaryOptions: async () => null,
    delete: async () => ({
      status: "currently_mounted",
      mounted_in: mountedIn,
    }),
    mount: async () => ({
      status: "space_occupied",
      position: { rack_id: 7, unit_no: 10, atom: "front" },
      object_id: 99,
    }),
  });
  t.after(() => app.close());
  for (const [request, statusCode, expectedCode] of [
    [
      {
        method: "POST",
        url: "/object",
        payload: { name: "server", objtype_id: 4 },
      },
      409,
      "OBJECT_NAME_CONFLICT",
    ],
    [{ method: "GET", url: "/object/42" }, 404, "OBJECT_NOT_FOUND"],
    [
      { method: "GET", url: "/object/by-name?name=server" },
      409,
      "OBJECT_LOOKUP_AMBIGUOUS",
    ],
    [
      { method: "GET", url: "/object/by-service-tag?service_tag=tag" },
      404,
      "OBJECT_NOT_FOUND",
    ],
    [{ method: "GET", url: "/object/42/summary" }, 404, "OBJECT_NOT_FOUND"],
    [
      { method: "GET", url: "/objects/dictionary/11" },
      404,
      "DICTIONARY_CHAPTER_NOT_FOUND",
    ],
    [{ method: "DELETE", url: "/object/42" }, 409, "OBJECT_CURRENTLY_MOUNTED"],
    [
      {
        method: "POST",
        url: "/object/mount",
        payload: { rack_id: 7, object_id: 42, start_unit: 10, height: 1 },
      },
      409,
      "OBJECT_SPACE_OCCUPIED",
    ],
  ] as const) {
    const response = await app.inject(request);
    assert.equal(response.statusCode, statusCode);
    assert.equal(response.json().code, expectedCode);
    if (expectedCode === "OBJECT_CURRENTLY_MOUNTED")
      assert.deepEqual(response.json().details, { objectId: 42, mountedIn });
  }
});

test("HTTP database errors keep the cause out of public responses", async (t) => {
  const app = appWith({
    get: async () => {
      throw new DatabaseOperationError(new Error("password=private"));
    },
  });
  t.after(() => app.close());
  const response = await app.inject("/object/42");
  assert.equal(response.statusCode, 500);
  assert.equal(response.json().code, "DATABASE_ERROR");
  assert.equal(response.body.includes("private"), false);
});

test("buildApp registers objects routes alongside racks", async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  const create = await app.inject({
    method: "POST",
    url: "/object",
    payload: {},
  });
  const list = await app.inject("/objects?per_page=101");
  assert.equal(create.statusCode, 400);
  assert.equal(create.json().code, "INVALID_OBJECT_INPUT");
  assert.equal(list.statusCode, 400);
  assert.equal(app.hasRoute({ method: "GET", url: "/racks" }), true);
});
