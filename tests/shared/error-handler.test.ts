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
