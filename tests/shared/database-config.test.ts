import assert from "node:assert/strict";
import test from "node:test";
import * as database from "../../src/database/prisma.js";

test("database configuration removes the URL path separator and decodes connection fields", () => {
  assert.deepEqual(
    database.databaseConfig(
      "mysql://test%40user:test%3Apass%2Fword@localhost:3307/rack%20tables",
    ),
    {
      host: "localhost",
      database: "rack tables",
      user: "test@user",
      password: "test:pass/word",
      port: 3307,
      allowPublicKeyRetrieval: true,
    },
  );
});

test("database configuration uses the MariaDB default port when the URL omits it", () => {
  const config = database.databaseConfig("mysql://user:pass@localhost/mydb");
  assert.equal(config.database, "mydb");
  assert.equal(config.port, 3306);
});
