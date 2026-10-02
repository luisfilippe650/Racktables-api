import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyBaseLogger } from "fastify";

import { RowNotFoundError } from "../../src/modules/rows/errors/rows.errors.js";
import { buildApp } from "../../src/server.js";

test("the global error handler serializes ApplicationError", async () => {
  const app = buildApp();
  app.get("/application-error", async () => {
    throw new RowNotFoundError(42);
  });

  const response = await app.inject({
    method: "GET",
    url: "/application-error",
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    code: "ROW_NOT_FOUND",
    message: "Row 42 was not found.",
    details: { rowId: 42 },
  });

  await app.close();
});

test("the global error handler hides unexpected error details", async () => {
  const loggedErrors: unknown[] = [];
  const logger = {
    level: "error",
    info() {},
    error(value: unknown) {
      loggedErrors.push(value);
    },
    debug() {},
    fatal() {},
    warn() {},
    trace() {},
    silent() {},
    child() {
      return logger;
    },
  } as unknown as FastifyBaseLogger;
  const app = buildApp({ loggerInstance: logger });
  app.get("/unexpected-error", async () => {
    throw new Error("password=secret");
  });

  const response = await app.inject({
    method: "GET",
    url: "/unexpected-error",
  });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), {
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error.",
  });
  assert.equal(response.body.includes("secret"), false);
  assert.equal(
    loggedErrors.some(
      (error) => error instanceof Error && error.message === "password=secret",
    ),
    true,
  );

  await app.close();
});

test("malformed JSON receives a parser error with status 400 rather than an internal error", async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  const response = await app.inject({
    method: "POST",
    url: "/v1/racktables/object",
    headers: { "content-type": "application/json" },
    payload: "{",
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, "FST_ERR_CTP_INVALID_JSON_BODY");
});

test("unsupported content types and oversized bodies keep their Fastify statuses", async (t) => {
  const app = buildApp({ bodyLimit: 64 });
  t.after(() => app.close());
  const unsupported = await app.inject({
    method: "POST",
    url: "/v1/racktables/object",
    headers: { "content-type": "application/xml" },
    payload: "<object/>",
  });
  assert.equal(unsupported.statusCode, 415);
  assert.equal(unsupported.json().code, "FST_ERR_CTP_INVALID_MEDIA_TYPE");
  const oversized = await app.inject({
    method: "POST",
    url: "/v1/racktables/object",
    payload: { name: "a".repeat(100), objtype_id: 4 },
  });
  assert.equal(oversized.statusCode, 413);
  assert.equal(oversized.json().code, "FST_ERR_CTP_BODY_TOO_LARGE");
});

test("unexpected application errors cannot expose secrets by attaching an HTTP status", async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  app.get("/untrusted-client-error", async () => {
    throw Object.assign(new Error("password=secret"), {
      statusCode: 400,
      code: "UNTRUSTED_ERROR",
    });
  });
  const response = await app.inject("/untrusted-client-error");
  assert.equal(response.statusCode, 500);
  assert.equal(response.json().code, "INTERNAL_SERVER_ERROR");
  assert.equal(response.body.includes("secret"), false);
});
