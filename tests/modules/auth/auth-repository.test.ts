import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../../../src/database/prisma.js";
import { AuthPrismaRepository } from "../../../src/modules/auth/repository/auth.prisma.js";
import { DatabaseOperationError } from "../../../src/shared/errors/database-operation.error.js";

function repository(findUnique: (query: unknown) => Promise<unknown>) {
  return new AuthPrismaRepository({
    userAccount: { findUnique },
  } as unknown as typeof Prisma);
}

test("auth finds credentials by login and selects only authentication fields", async () => {
  const user = {
    user_id: 7,
    user_name: "admin",
    user_password_hash: "stored-password-hash",
  };
  const repo = repository(async (query) => {
    assert.deepEqual(query, {
      where: { user_name: "admin" },
      select: { user_id: true, user_name: true, user_password_hash: true },
    });
    return user;
  });
  assert.deepEqual(await repo.findByLogin("admin"), user);
});

test("auth returns null for an unknown login", async () => {
  assert.equal(await repository(async () => null).findByLogin("unknown"), null);
});

test("auth preserves accounts without a local password hash", async () => {
  const user = { user_id: 8, user_name: "external", user_password_hash: null };
  assert.deepEqual(await repository(async () => user).findByLogin("external"), user);
});

test("auth reports database failures instead of treating them as missing users", async () => {
  const cause = new Error("synthetic database failure");
  const repo = repository(async () => { throw cause; });
  await assert.rejects(repo.findByLogin("admin"), (error: unknown) => {
    assert.ok(error instanceof DatabaseOperationError);
    assert.equal(error.cause, cause);
    return true;
  });
});
