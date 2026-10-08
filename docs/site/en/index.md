# RackTables REST API

**English** | [Português (Brasil)](../index.md)

An integration layer developed at INPE to query and update the RackTables inventory over HTTP. The API uses TypeScript, Fastify, and Prisma with an existing MySQL/MariaDB database.

## Start here

1. [Install and run the API](installation.md).
2. [Log in and obtain a token](authentication.md).
3. Read the [endpoint reference](endpoints.md) and [usage examples](examples.md).

## Available features

Physical locations, rows, racks, equipment, dynamic attributes, mounting, unmounting, and moving equipment between racks.

## Interactive documentation

With the API running with its default configuration:

- [Swagger UI](http://localhost:8000/v1/racktables/docs): inspect and test routes.
- [OpenAPI specification](http://localhost:8000/v1/racktables/docs/json): endpoint contracts in JSON.

These addresses point to the API on your computer. Adjust the host and port for your installation. In Swagger, obtain a token from `/auth/login` and enter it using **Authorize**.

## For developers

- [Rack storage architecture](architecture/racktables-racks.md).
- [Editing and building this documentation](documentation.md).
- [HTTP status codes and troubleshooting](errors.md).
