import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../../src/server.js";

test("server registers every module under the RackTables v1 prefix", async (t) => {
  const app = buildApp({}, { jwtSecret: "test-secret-at-least-32-characters-long" });
  t.after(() => app.close());
  await app.ready();
  const routes: Array<[string, string]> = [
    ["POST", "/location"],
    ["PATCH", "/location/:id"],
    ["DELETE", "/location/:id"],
    ["GET", "/location/:id"],
    ["GET", "/locations"],
    ["POST", "/row"],
    ["PATCH", "/row/:id"],
    ["DELETE", "/row/:id"],
    ["GET", "/row/:id"],
    ["GET", "/row/by-name"],
    ["GET", "/rows"],
    ["PATCH", "/row/link/:rowId/:locationId"],
    ["PATCH", "/row/unlink/:rowId/:locationId"],
    ["POST", "/rack"],
    ["PATCH", "/rack/:id"],
    ["DELETE", "/rack/:id"],
    ["GET", "/rack/:id"],
    ["GET", "/racks"],
    ["GET", "/rack/by-name"],
    ["GET", "/rack/:id/details"],
    ["GET", "/rack/:id/occupancy"],
    ["GET", "/racks/occupancy"],
    ["GET", "/rack/:id/spaces"],
    ["GET", "/rack/:rackId/spaces/:unitNo/:atom"],
    ["GET", "/rack/:rackId/objects/:objectId/spaces"],
    ["POST", "/object"],
    ["PATCH", "/object/:id"],
    ["DELETE", "/object/:id"],
    ["GET", "/object/:id"],
    ["GET", "/object/by-name"],
    ["GET", "/object/by-service-tag"],
    ["GET", "/objects"],
    ["GET", "/objects/all"],
    ["GET", "/objects/types"],
    ["GET", "/object/:id/summary"],
    ["GET", "/objects/dictionary/:chapter_id"],
    ["POST", "/object/mount"],
    ["DELETE", "/object/:id/mount"],
    ["POST", "/object/move"],
  ];
  for (const [method, path] of routes) {
    assert.equal(
      app.hasRoute({ method: method as "GET", url: `/v1/racktables${path}` }),
      true,
      `${method} ${path}`,
    );
    assert.equal(
      app.hasRoute({ method: method as "GET", url: path }),
      false,
      `Unprefixed route: ${path}`,
    );
    const response = await app.inject({ method: method as "GET", url: `/v1/racktables${path.replace(/:[A-Za-z_]+/g, "1")}` });
    assert.equal(response.statusCode, 401, `Token required: ${method} ${path}`);
  }
  assert.equal((await app.inject("/v1/racktables/docs/json")).statusCode, 200);
});
