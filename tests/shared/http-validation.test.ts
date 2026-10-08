import assert from "node:assert/strict";
import test from "node:test";
import type { HTTPMethods } from "fastify";
import { buildApp } from "../../src/server.js";

const prefix = "/v1/racktables";
const secret = "validation-test-secret-at-least-32-bytes";

test("authenticated HTTP requests reject invalid inputs before database access", async (t) => {
  const app = buildApp({}, {
    jwtSecret: secret,
    authRepository: {
      findByLogin: async () => ({
        user_id: 1,
        user_name: "admin",
        user_password_hash: "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8",
      }),
    },
  });
  t.after(() => app.close());
  const login = await app.inject({
    method: "POST", url: `${prefix}/auth/login`,
    payload: { login: "admin", password: "password" },
  });
  assert.equal(login.statusCode, 200);
  const headers = { authorization: `Bearer ${login.json().access_token}` };
  const cases: Array<[HTTPMethods, string, unknown?]> = [
    ["POST", "/location", { name: " " }],
    ["POST", "/location", { name: "A", extra: true }],
    ["PATCH", "/location/1", {}],
    ["GET", "/location/invalid"],
    ["DELETE", "/location/0"],
    ["POST", "/row", { name: " " }],
    ["POST", "/row", { name: "A", locationId: 1 }],
    ["PATCH", "/row/1", {}],
    ["GET", "/row/0"],
    ["DELETE", "/row/-1"],
    ["GET", "/row/by-name?name=%20"],
    ["PATCH", "/row/link/0/1"],
    ["PATCH", "/row/unlink/1/0"],
    ["POST", "/rack", { name: "A", row_id: 0 }],
    ["POST", "/rack", { name: "A", row_id: 1, rack_height: 1001 }],
    ["PATCH", "/rack/1", { name: " " }],
    ["GET", "/rack/0"],
    ["DELETE", "/rack/-1"],
    ["GET", "/rack/by-name?name=%20"],
    ["GET", "/rack/0/details"],
    ["GET", "/rack/0/occupancy"],
    ["GET", "/rack/0/spaces"],
    ["GET", "/rack/1/spaces/1/invalid"],
    ["GET", "/rack/1/objects/0/spaces"],
    ["GET", "/racks?per_page=101"],
    ["GET", "/racks/occupancy?page=2147483647&per_page=100"],
    ["POST", "/object", { name: "A", objtype_id: 1560 }],
    ["POST", "/object", { name: " ", objtype_id: 4 }],
    ["PATCH", "/object/1", { objtype_id: 4 }],
    ["PATCH", "/object/0", { name: "A" }],
    ["GET", "/object/0"],
    ["DELETE", "/object/0"],
    ["GET", "/object/by-name?name=%20"],
    ["GET", "/object/by-service-tag?service_tag=%20"],
    ["GET", "/objects?page=1001"],
    ["GET", "/objects/all?per_page=101"],
    ["GET", "/objects/types?page=0"],
    ["GET", "/objects/dictionary/0"],
    ["GET", "/object/1/summary?include_options=maybe"],
    ["POST", "/object/mount", { object_id: 1, rack_id: 1, start_unit: 2, height: 3 }],
    ["DELETE", "/object/0/mount"],
    ["POST", "/object/move", { object_id: 1, destination_rack_id: 1, start_unit: 1001 }],
  ];
  for (const [method, path, payload] of cases) {
    await t.test(`${method} ${path} ${JSON.stringify(payload) ?? ""}`, async () => {
      const response = await app.inject({ method, url: `${prefix}${path}`, headers, payload });
      assert.equal(response.statusCode, 400, response.body);
      const body = response.json();
      if (path.startsWith("/object")) {
        assert.equal(body.code, "INVALID_OBJECT_INPUT");
        assert.ok(body.details.issues.length > 0);
      } else {
        assert.ok(body.errors.length > 0);
      }
    });
  }

  await t.test("body parser returns controlled errors for malformed and oversized bodies", async () => {
    for (const [contentType, payload, status, code] of [
      ["application/json", "{", 400, "FST_ERR_CTP_INVALID_JSON_BODY"],
      ["application/json", "", 400, "FST_ERR_CTP_EMPTY_JSON_BODY"],
      ["application/xml", "<object/>", 415, "FST_ERR_CTP_INVALID_MEDIA_TYPE"],
      ["application/json", JSON.stringify({ name: "a".repeat(1_048_576) }), 413, "FST_ERR_CTP_BODY_TOO_LARGE"],
    ] as const) {
      const response = await app.inject({ method: "POST", url: `${prefix}/object`, headers: { ...headers, "content-type": contentType }, payload });
      assert.equal(response.statusCode, status, response.body);
      assert.equal(response.json().code, code);
    }
  });
});

test("startup rejects absent or weak JWT secrets", async () => {
  for (const jwtSecret of ["", "too-short"]) {
    const app = buildApp({}, { jwtSecret });
    try {
      await assert.rejects(app.ready(), /JWT_SECRET/);
    } finally {
      await app.close();
    }
  }
});
