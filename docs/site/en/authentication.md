# Authentication

**English** | [Português (Brasil)](../autenticacao.md)

Set `JWT_SECRET` in `.env` to a random secret of at least 32 bytes. Generate a value with `openssl rand -hex 32`. The API refuses to start without this secret.

Log in using existing RackTables credentials:

```bash
curl -X POST http://localhost:8000/v1/racktables/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"admin","password":"your-password"}'
```

The response contains `access_token`, `token_type`, `expires_in` (3600 seconds), and `user` (ID and login). Passwords and hashes are not returned. The existing SHA-1 hash is checked for RackTables compatibility; this flow does not create users or change passwords in the database.

Send the token with every data request:

```bash
curl http://localhost:8000/v1/racktables/auth/me \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Login and `/v1/racktables/docs` (including its assets and specifications) are public. All data routes require `Authorization: Bearer YOUR_TOKEN`.

In Swagger, log in at `/auth/login`, copy `access_token`, and enter the token using **Authorize** to test protected routes. Incorrect credentials and missing, invalid, or expired tokens return `401`.

All authenticated users can access data routes; this API does not evaluate RackCode permissions. To end a session, discard the token on the client; it remains valid until it expires.
