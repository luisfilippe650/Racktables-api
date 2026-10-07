import assert from "node:assert/strict";
import test from "node:test";
import { AuthService } from "../../../src/modules/auth/auth.service.js";

test("login rejects absent or malformed stored password hashes", async () => {
  for (const hash of [null, "", "plaintext", "x".repeat(40)]) {
    const service = new AuthService({ findByLogin: async () => ({
      user_id: 1, user_name: "admin", user_password_hash: hash,
    }) });
    await assert.rejects(service.login({ login: "admin", password: "password" }), {
      code: "INVALID_CREDENTIALS", statusCode: 401,
    });
  }
});
