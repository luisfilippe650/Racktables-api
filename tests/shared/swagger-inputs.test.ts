import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/server.js";

test("Swagger exposes path parameters, query filters and request bodies", async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  const response = await app.inject("/v1/racktables/docs/json");
  const { paths } = response.json();
  const operation = (path: string, method = "get") =>
    paths[`/v1/racktables${path}`][method];
  assert.ok(
    operation("/rack/by-name").parameters?.some(
      (p: any) => p.name === "name" && p.in === "query" && p.required,
    ),
  );
  for (const [path, item] of Object.entries(paths) as Array<[string, any]>) {
    for (const [method, op] of Object.entries(item) as Array<[string, any]>) {
      for (const match of path.matchAll(/\{([^}]+)\}/g)) {
        assert.ok(
          op.parameters?.some(
            (p: any) => p.name === match[1] && p.in === "path" && p.required,
          ),
          `${method} ${path}: ${match[1]}`,
        );
      }
    }
  }
  for (const path of [
    "/racks",
    "/racks/occupancy",
    "/objects",
    "/objects/all",
    "/objects/types",
    "/objects/dictionary/{chapter_id}",
  ]) {
    assert.ok(operation(path).parameters.some((p: any) => p.name === "page"));
    assert.ok(
      operation(path).parameters.some((p: any) => p.name === "per_page"),
    );
  }
  assert.ok(
    operation("/objects/all").parameters.some((p: any) => p.name === "search"),
  );
  assert.ok(
    operation("/object/{id}/summary").parameters.some(
      (p: any) => p.name === "include_options",
    ),
  );
  assert.ok(
    operation("/object/by-service-tag").parameters.some(
      (p: any) => p.name === "service_tag",
    ),
  );
  for (const path of [
    "/location",
    "/row",
    "/rack",
    "/object",
    "/object/mount",
    "/object/move",
  ]) {
    assert.ok(
      operation(path, "post").requestBody?.content["application/json"].schema
        .properties,
      path,
    );
  }
  for (const path of [
    "/location/{id}",
    "/row/{id}",
    "/rack/{id}",
    "/object/{id}",
  ]) {
    assert.ok(
      operation(path, "patch").requestBody?.content["application/json"].schema
        .properties,
      path,
    );
  }
  assert.deepEqual(
    operation("/object/mount", "post").requestBody.content["application/json"]
      .schema.required,
    ["rack_id", "object_id", "start_unit", "height"],
  );
});
