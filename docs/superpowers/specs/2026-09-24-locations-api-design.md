# Locations API Design

## Objective

Complete the Fastify locations CRUD over RackTables' shared `Object` table, expose it under `/v1/racktables`, and correct the runtime and contract issues found during review.

## HTTP API

The server registers the locations plugin with the `/v1/racktables` prefix. The resulting routes are:

- `POST /v1/racktables/locations`
- `GET /v1/racktables/locations`
- `GET /v1/racktables/locations/:id`
- `PATCH /v1/racktables/locations/:id`
- `DELETE /v1/racktables/locations/:id`

Create accepts only `{ name: string }`. Update receives `id` from the URL and `{ name: string }` from the body. Both bodies reject unknown fields. URL IDs are coerced to positive integers by the shared Zod params schema.

## Architecture

`server.ts` creates the Fastify instance, installs the global application error handler, registers the locations routes, and listens on `0.0.0.0`. `PORT` is optional and defaults to `3000`.

The locations module keeps four responsibilities separate:

- Router: declares plural REST paths and composes the controller, service, and Prisma repository.
- Controller: validates URL params and request bodies, delegates to the service, and returns explicit HTTP success responses.
- Service: applies application behavior and exposes application errors.
- Repository: performs Prisma operations against the shared `Object` table and always constrains operations to `OBJECT_TYPES.LOCATION`.

## Persistence and Error Flow

Create, update, and delete no longer turn every persistence failure into `null`. The Prisma repository maps a missing update/delete target to `LocationNotFoundError` and lets unexpected persistence failures propagate as their original errors.

`getLocation` returns `null` from the repository when no matching location exists; the service converts that result to `LocationNotFoundError`. `getAllLocations` returns an array and correctly delegates to the repository rather than recursively calling itself.

The global Fastify error handler maps:

- Invalid Zod input handled by controllers to HTTP 400.
- `LocationNotFoundError` to HTTP 404.
- Unexpected errors to HTTP 500 after logging them.

Successful responses use:

- HTTP 201 for create.
- HTTP 204 for delete.
- HTTP 200 for update and reads.

## Types and Schemas

`CreateLocationSchema` contains only the required `name` field and is strict. `UpdateLocationSchema` contains only the required `name` field and is strict. The shared `ObjectIdParamsSchema` validates every `:id` parameter.

Repository contracts reflect actual Prisma behavior:

- Create and update return `LocationOutput` or throw.
- Delete returns `void` or throws.
- Get one returns `LocationOutput | null`.
- Get all returns `LocationOutput[]`, including an empty array when no locations exist.

## Verification

Tests cover the location schemas and service behaviors, including:

- Create accepts name without a client-provided ID.
- Unknown create/update fields are rejected.
- Update combines the route ID with the validated body.
- Get all delegates to the repository without recursion.
- Missing locations produce `LocationNotFoundError`.
- Successful delete does not produce an error.

The project test script will run the TypeScript tests, and final verification will run both the test suite and `npm run typecheck`.

## Non-goals

- Authentication and authorization.
- Pagination or filtering beyond the location object type.
- Changes to the Prisma schema or database migrations.
- Refactoring unrelated modules.
