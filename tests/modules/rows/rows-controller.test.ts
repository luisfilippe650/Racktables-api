import assert from "node:assert/strict";
import test from "node:test";

import type { FastifyReply, FastifyRequest } from "fastify";
import { RowsController } from "../../../src/modules/rows/rows.controller.js";
import type { RowService } from "../../../src/modules/rows/rows.service.js";

function createReply() {
  const state: { statusCode?: number; body?: unknown } = {};
  const reply = {
    status(statusCode: number) {
      state.statusCode = statusCode;
      return reply;
    },
    send(body?: unknown) {
      state.body = body;
      return reply;
    },
  } as unknown as FastifyReply;

  return { reply, state };
}

test("create validates the body and returns the created row with status 201", async () => {
  const row = {
    id: 42,
    name: "Row A",
    label: null,
    objtype_id: 1561,
    asset_no: null,
    has_problems: "no" as const,
    comment: null,
  };
  const service = {
    create: async () => row,
  } as unknown as RowService;
  const controller = new RowsController(service);
  const request = { body: { name: " Row A " } } as FastifyRequest;
  const { reply, state } = createReply();

  await controller.create(request, reply);

  assert.equal(state.statusCode, 201);
  assert.deepEqual(state.body, row);
});

test("update validates the id and body and returns the updated row with status 200", async () => {
  const row = {
    id: 42,
    name: "Row B",
    label: null,
    objtype_id: 1561,
    asset_no: null,
    has_problems: "no" as const,
    comment: null,
  };
  let received: unknown;
  const service = {
    update: async (id: number, body: unknown) => {
      received = { id, body };
      return row;
    },
  } as unknown as RowService;
  const controller = new RowsController(service);
  const request = {
    params: { id: "42" },
    body: { name: " Row B " },
  } as unknown as FastifyRequest;
  const { reply, state } = createReply();

  await controller.update(request, reply);

  assert.deepEqual(received, { id: 42, body: { name: "Row B" } });
  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.body, row);
});

test("linkToLocation delegates coerced ids and returns status 204", async () => {
  let received: unknown;
  const service = {
    linkToLocation: async (rowId: number, locationId: number) => {
      received = { rowId, locationId };
    },
  } as unknown as RowService;
  const controller = new RowsController(service);
  const request = {
    params: { rowId: "42", locationId: "7" },
  } as unknown as FastifyRequest;
  const { reply, state } = createReply();

  await controller.linkToLocation(request, reply);

  assert.deepEqual(received, { rowId: 42, locationId: 7 });
  assert.equal(state.statusCode, 204);
  assert.equal(state.body, undefined);
});

test("unlinkFromLocation delegates coerced ids and returns status 204", async () => {
  let received: unknown;
  const service = {
    unlinkFromLocation: async (rowId: number, locationId: number) => {
      received = { rowId, locationId };
    },
  } as unknown as RowService;
  const controller = new RowsController(service);
  const request = {
    params: { rowId: "42", locationId: "7" },
  } as unknown as FastifyRequest;
  const { reply, state } = createReply();

  await controller.unlinkFromLocation(request, reply);

  assert.deepEqual(received, { rowId: 42, locationId: 7 });
  assert.equal(state.statusCode, 204);
  assert.equal(state.body, undefined);
});

test("delete delegates the coerced row id and returns status 204", async () => {
  let receivedId: number | undefined;
  const service = {
    delete: async (rowId: number) => {
      receivedId = rowId;
    },
  } as unknown as RowService;
  const controller = new RowsController(service);
  const request = {
    params: { id: "42" },
  } as unknown as FastifyRequest;
  const { reply, state } = createReply();

  await controller.delete(request, reply);

  assert.equal(receivedId, 42);
  assert.equal(state.statusCode, 204);
  assert.equal(state.body, undefined);
});
