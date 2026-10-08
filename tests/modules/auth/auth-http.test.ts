import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { buildApp } from "../../../src/server.js";

test("login verifies RackTables passwords and protects API routes", async (t) => {
  const app = buildApp({}, {
    jwtSecret: "test-secret-at-least-32-characters-long",
    authRepository: {
      findByLogin: async (login) => login === "admin" ? {
        user_id: 1, user_name: "admin",
        user_password_hash: "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8",
      } : null,
    },
  });
  t.after(() => app.close());
  assert.equal((await app.inject("/v1/racktables/locations")).statusCode, 401);
  for (const payload of [
    { login: "admin", password: "wrong" },
    { login: "missing", password: "password" },
  ]) {
    assert.equal((await app.inject({ method: "POST", url: "/v1/racktables/auth/login", payload })).statusCode, 401);
  }
  assert.equal((await app.inject({ method: "POST", url: "/v1/racktables/auth/login", payload: {} })).statusCode, 400);
  const response = await app.inject({ method: "POST", url: "/v1/racktables/auth/login", payload: { login: "admin", password: "password" } });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.expires_in, 3600);
  assert.deepEqual(body.user, { id: 1, login: "admin" });
  assert.equal(JSON.stringify(body).includes("password"), false);
  const me = await app.inject({ url: "/v1/racktables/auth/me", headers: { authorization: `Bearer ${body.access_token}` } });
  assert.equal(me.statusCode, 200);
  assert.deepEqual(me.json(), { id: 1, login: "admin" });
  const expiredPayload = Buffer.from(JSON.stringify({ sub: "1", login: "admin", exp: 1 })).toString("base64url");
  const expiredContent = `${body.access_token.split(".")[0]}.${expiredPayload}`;
  const expired = `${expiredContent}.${createHmac("sha256", "test-secret-at-least-32-characters-long").update(expiredContent).digest("base64url")}`;
  for (const token of ["invalid", expired]) {
    assert.equal((await app.inject({ url: "/v1/racktables/auth/me", headers: { authorization: `Bearer ${token}` } })).statusCode, 401);
  }
  const authorized = await app.inject({ url: "/v1/racktables/location/invalid", headers: { authorization: `Bearer ${body.access_token}` } });
  assert.equal(authorized.statusCode, 400);
  for (const url of ["/v1/racktables/docs", "/v1/racktables/docs/", "/v1/racktables/docs/json", "/v1/racktables/docs/yaml", "/v1/racktables/docs/static/swagger-ui.css"]) {
    assert.equal((await app.inject(url)).statusCode, 200, url);
  }
  const docs = await app.inject({ url: "/v1/racktables/docs/json", headers: { authorization: `Bearer ${body.access_token}` } });
  assert.equal(docs.statusCode, 200);
  const paths = docs.json().paths;
  const bearer = docs.json().components.securitySchemes.bearerAuth;
  assert.equal(bearer.type, "http");
  assert.equal(bearer.scheme, "bearer");
  assert.match(bearer.description, /Authorization: Bearer/);
  for (const [path, operations] of Object.entries(paths) as Array<[string, any]>) {
    for (const [method, operation] of Object.entries(operations) as Array<[string, any]>) {
      if (!["get", "post", "patch", "delete", "put", "head", "options"].includes(method)) continue;
      if (path === "/v1/racktables/auth/login" && method === "post") continue;
      assert.deepEqual(operation.security, [{ bearerAuth: [] }], `${method} ${path}`);
      const unauthorized = operation.responses["401"]?.content["application/json"]?.schema;
      assert.ok(unauthorized, `401 documented: ${method} ${path}`);
      assert.equal(unauthorized.type, "object");
      assert.deepEqual(unauthorized.required, ["message"]);
      assert.equal(unauthorized.properties.message.type, "string");
    }
  }
  const login = paths["/v1/racktables/auth/login"].post;
  const input = login.requestBody.content["application/json"].schema;
  assert.deepEqual(input.required, ["login", "password"]);
  assert.equal(input.additionalProperties, false);
  assert.equal(input.properties.password.maxLength, 1024);
  assert.deepEqual(login.security, []);
  const output = login.responses["200"].content["application/json"].schema;
  assert.ok(output.properties.access_token);
  assert.equal(output.properties.user.properties.user_password_hash, undefined);
  assert.ok(paths["/v1/racktables/auth/me"].get.responses["200"].content["application/json"].schema.properties.login);
});
