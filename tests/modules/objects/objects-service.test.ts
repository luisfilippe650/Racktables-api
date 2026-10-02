import assert from "node:assert/strict";
import test from "node:test";
import * as module from "../../../src/modules/objects/objects.service.js";
import type { ObjectsRepository } from "../../../src/modules/objects/repository/objects.repository.js";
import type { ObjectPlacementFailure } from "../../../src/modules/objects/entity/objects-placement.entity.js";
import { ApplicationError } from "../../../src/shared/errors/application.error.js";

const object = {
  id: 42,
  name: "server",
  label: null,
  asset_no: null,
  objtype_id: 4,
  has_problems: "no" as const,
  comment: null,
};
function service(repository: Partial<ObjectsRepository>) {
  return new module.ObjectsService(repository as ObjectsRepository);
}
const code = (expected: string) => (error: unknown) => {
  assert.ok(error instanceof ApplicationError);
  assert.equal(error.code, expected);
  return true;
};

test("service normalizes creation input and actor, returning object and created ports", async () => {
  let received: unknown;
  const result = await service({
    create: async (data, actor) => {
      received = { data, actor };
      return { status: "created", object, ports_created: 3 };
    },
  }).create({ name: " server ", objtype_id: 4, label: " " }, " alice ");
  assert.deepEqual(received, {
    data: { name: "server", objtype_id: 4, label: null },
    actor: "alice",
  });
  assert.deepEqual(result, { object, ports_created: 3 });
});

test("invalid requests never reach persistence, including service calls without a controller", async () => {
  const instance = service({});
  for (const operation of [
    () => instance.create({ name: " ", objtype_id: 4 }),
    () => instance.update(42, {}),
    () => instance.delete(0),
    () => instance.get(-1),
    () => instance.getByName(" "),
    () => instance.getByServiceTag(" "),
    () => instance.getAll({ per_page: 101 }),
    () => instance.getAllObjects({ search: "a".repeat(256) }),
    () => instance.getTypes({ page: 0 }),
    // @ts-expect-error Exercise runtime validation for callers bypassing TypeScript.
    () => instance.getSummary(42, "bad"),
    () => instance.getDictionaryOptions(0),
    () =>
      instance.mount({ rack_id: 7, object_id: 42, start_unit: 1, height: 2 }),
    () => instance.unmount(0),
    () =>
      instance.move({ object_id: 42, destination_rack_id: 0, start_unit: 10 }),
    () => instance.create({ name: "server", objtype_id: 4 }, " "),
  ])
    await assert.rejects(operation, code("INVALID_OBJECT_INPUT"));
});

test("creation maps all repository conflicts to application errors", async () => {
  for (const [status, expected] of [
    ["invalid_type", "OBJECT_TYPE_INVALID"],
    ["type_not_allowed", "OBJECT_TYPE_NOT_ALLOWED"],
    ["name_conflict", "OBJECT_NAME_CONFLICT"],
    ["asset_conflict", "OBJECT_ASSET_CONFLICT"],
  ] as const) {
    await assert.rejects(
      () =>
        service({ create: async () => ({ status }) }).create({
          name: "server",
          objtype_id: 4,
          asset_no: "tag",
        }),
      code(expected),
    );
  }
});

test("updates preserve metadata, validate fixed fields and pass actor to persistence", async () => {
  let received: unknown;
  const instance = service({
    update: async (data, actor) => {
      received = { data, actor };
      return {
        status: "updated",
        object,
        fixed_fields_updated: ["has_problems"],
        dynamic_attributes_updated: 1,
      };
    },
  });
  assert.deepEqual(
    await instance.update(
      42,
      { has_problems: true, CPU: { clear: true } },
      "alice",
    ),
    {
      object,
      fixed_fields_updated: ["has_problems"],
      dynamic_attributes_updated: 1,
    },
  );
  assert.deepEqual(received, {
    data: { id: 42, updates: { has_problems: "yes", CPU: { clear: true } } },
    actor: "alice",
  });
});

test("update conflicts retain invalid attribute options without extra reads", async () => {
  const options = [{ id: 9, name: "Dell" }];
  const instance = service({
    update: async () => ({
      status: "invalid_attribute",
      field: "Model",
      message: "Invalid model.",
      available_options: options,
    }),
  });
  await assert.rejects(
    () => instance.update(42, { Model: "bad" }),
    (error: unknown) => {
      assert.ok(error instanceof ApplicationError);
      assert.equal(error.code, "INVALID_OBJECT_ATTRIBUTE");
      assert.deepEqual(error.details, {
        field: "Model",
        availableOptions: options,
      });
      return true;
    },
  );
  for (const [status, expected] of [
    ["not_found", "OBJECT_NOT_FOUND"],
    ["type_not_allowed", "OBJECT_TYPE_NOT_ALLOWED"],
    ["name_conflict", "OBJECT_NAME_CONFLICT"],
    ["asset_conflict", "OBJECT_ASSET_CONFLICT"],
  ] as const) {
    await assert.rejects(
      () =>
        service({ update: async () => ({ status }) }).update(42, {
          name: "server",
          asset_no: "tag",
        }),
      code(expected),
    );
  }
});

test("delete maps protection failures and forwards actor on successful deletion", async () => {
  for (const [result, expected] of [
    [{ status: "not_found" }, "OBJECT_NOT_FOUND"],
    [{ status: "type_not_allowed" }, "OBJECT_TYPE_NOT_ALLOWED"],
    [{ status: "has_children" }, "OBJECT_HAS_CHILDREN"],
    [
      { status: "currently_mounted", mounted_in: [] },
      "OBJECT_CURRENTLY_MOUNTED",
    ],
    [
      { status: "physical_port_links", links: [] },
      "OBJECT_PHYSICAL_PORT_LINKS",
    ],
  ] as const)
    await assert.rejects(
      () =>
        service({
          delete: async () =>
            result as Awaited<ReturnType<ObjectsRepository["delete"]>>,
        }).delete(42),
      code(expected),
    );
  let received: unknown;
  assert.equal(
    await service({
      delete: async (id, actor) => {
        received = { id, actor };
        return { status: "deleted", object_id: id, objtype_id: 4 };
      },
    }).delete(42, "alice"),
    undefined,
  );
  assert.deepEqual(received, { id: 42, actor: "alice" });
});

test("lookups distinguish not found and ambiguous results", async () => {
  assert.deepEqual(await service({ get: async () => object }).get(42), object);
  await assert.rejects(
    () => service({ get: async () => null }).get(42),
    code("OBJECT_NOT_FOUND"),
  );
  for (const method of ["getByName", "getByServiceTag"] as const) {
    const match = service({
      [method]: async (value: string) => {
        assert.equal(value, "server");
        return { status: "found", object };
      },
    });
    assert.deepEqual(await match[method](" server "), object);
    await assert.rejects(
      () =>
        service({ [method]: async () => ({ status: "ambiguous" }) })[method](
          "server",
        ),
      code("OBJECT_LOOKUP_AMBIGUOUS"),
    );
    await assert.rejects(
      () =>
        service({ [method]: async () => ({ status: "not_found" }) })[method](
          "server",
        ),
      code("OBJECT_NOT_FOUND"),
    );
  }
});

test("pagination uses defaults and summary handles missing records", async () => {
  for (const method of ["getAll", "getAllObjects", "getTypes"] as const) {
    const result = await service({
      [method]: async (query: unknown) => {
        assert.deepEqual(query, { page: 1, per_page: 50 });
        return { page: 1, per_page: 50, items: [], total: 0 };
      },
    })[method]();
    assert.deepEqual(result, { page: 1, per_page: 50, items: [], total: 0 });
  }
  await assert.rejects(
    () =>
      service({
        getSummary: async (id, include) => {
          assert.equal(id, 42);
          assert.equal(include, false);
          return null;
        },
      }).getSummary(42, "false"),
    code("OBJECT_NOT_FOUND"),
  );
  await assert.rejects(
    () =>
      service({ getDictionaryOptions: async () => null }).getDictionaryOptions(
        11,
      ),
    code("DICTIONARY_CHAPTER_NOT_FOUND"),
  );
});

test("all placement failures map to actionable application errors", async () => {
  const failures: [ObjectPlacementFailure, string][] = [
    [{ status: "object_not_found" }, "OBJECT_NOT_FOUND"],
    [{ status: "rack_not_found" }, "RACK_NOT_FOUND"],
    [{ status: "type_not_allowed" }, "OBJECT_TYPE_NOT_ALLOWED"],
    [{ status: "already_mounted" }, "OBJECT_ALREADY_MOUNTED"],
    [{ status: "not_mounted" }, "OBJECT_NOT_MOUNTED"],
    [{ status: "inconsistent_allocation" }, "OBJECT_ALLOCATION_INCONSISTENT"],
    [{ status: "rack_height_missing" }, "RACK_HEIGHT_INVALID"],
    [{ status: "rack_height_invalid" }, "RACK_HEIGHT_INVALID"],
    [{ status: "out_of_bounds" }, "OBJECT_ALLOCATION_OUT_OF_BOUNDS"],
    [
      {
        status: "space_occupied",
        position: { rack_id: 7, unit_no: 10, atom: "front" },
        object_id: null,
      },
      "OBJECT_SPACE_OCCUPIED",
    ],
  ];
  for (const [result, expected] of failures) {
    await assert.rejects(
      () =>
        service({ mount: async () => result }).mount({
          rack_id: 7,
          object_id: 42,
          start_unit: 10,
          height: 1,
        }),
      code(expected),
    );
    await assert.rejects(
      () =>
        service({ move: async () => result }).move({
          destination_rack_id: 7,
          object_id: 42,
          start_unit: 10,
        }),
      code(expected),
    );
    await assert.rejects(
      () => service({ unmount: async () => result }).unmount(42),
      code(expected),
    );
  }
});

test("mount, unmount and move return allocations without preliminary reads", async () => {
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
  const instance = service({
    mount: async (data, actor) => {
      assert.deepEqual(data, {
        rack_id: 7,
        object_id: 42,
        start_unit: 10,
        height: 1,
      });
      assert.equal(actor, "alice");
      return { status: "mounted", allocation: mount };
    },
    unmount: async (id, actor) => {
      assert.equal(id, 42);
      assert.equal(actor, "alice");
      return { status: "unmounted", allocation: unmount };
    },
    move: async (data, actor) => {
      assert.deepEqual(data, {
        object_id: 42,
        destination_rack_id: 8,
        start_unit: 20,
      });
      assert.equal(actor, "alice");
      return { status: "moved", allocation: move };
    },
  });
  assert.deepEqual(
    await instance.mount(
      { rack_id: 7, object_id: 42, start_unit: 10, height: 1 },
      "alice",
    ),
    mount,
  );
  assert.deepEqual(await instance.unmount(42, "alice"), unmount);
  assert.deepEqual(
    await instance.move(
      { object_id: 42, destination_rack_id: 8, start_unit: 20 },
      "alice",
    ),
    move,
  );
});
