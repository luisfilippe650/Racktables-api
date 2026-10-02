import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { rowsRouter } from "../../../src/modules/rows/rows.routers.js";
import type { RowRepository } from "../../../src/modules/rows/repository/rows.repository.js";
import { registerErrorHandler } from "../../../src/shared/errors/error-handler.js";

const row = {
  id: 42,
  name: "Row A",
  objtype_id: 1561,
  label: null,
  asset_no: null,
  has_problems: "no" as const,
  comment: null,
};

test("row routes distinguish ID and name lookup and normalize link parameters", async (t) => {
  const app = Fastify();
  registerErrorHandler(app);
  app.register(rowsRouter, {
    prefix: "/v1/racktables",
    repository: {
      get: async (id) => {
        assert.equal(id, 42);
        return row;
      },
      getByName: async (name) => {
        assert.equal(name, "Row A");
        return row;
      },
      getAll: async () => [row],
      linkToLocation: async (rowId, locationId) => {
        assert.deepEqual([rowId, locationId], [42, 7]);
        return { status: "linked" };
      },
      unlinkFromLocation: async (rowId, locationId) => {
        assert.deepEqual([rowId, locationId], [42, 7]);
        return { status: "unlinked" };
      },
    } as RowRepository,
  });
  t.after(() => app.close());
  for (const url of ["/row/42", "/row/by-name?name=%20Row%20A%20", "/rows"]) {
    const response = await app.inject(`/v1/racktables${url}`);
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json(), url === "/rows" ? [row] : row);
  }
  for (const action of ["link", "unlink"]) {
    const response = await app.inject({
      method: "PATCH",
      url: `/v1/racktables/row/${action}/42/7`,
    });
    assert.equal(response.statusCode, 204, response.body);
  }
});
