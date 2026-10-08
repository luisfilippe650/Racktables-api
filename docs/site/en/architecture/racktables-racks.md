# How racks are stored in RackTables

**English** | [Português (Brasil)](../../architecture/racktables-racks.md)

This page describes this project's Prisma schema and the current rack module contract.

## Object is the central table

Locations, rows, racks, and equipment are records in `Object`. The `objtype_id` field distinguishes their types: location = 1562, row = 1561, and rack = 1560. IDs are shared: racks and servers do not have independent sequences.

`Object` stores common fields: name, label, asset number (`asset_no`), problem flag, and comment. `asset_no` is unique across all objects and can be `NULL` when omitted. Names have no uniqueness constraint: the module prevents duplicate rack names within serializable transactions.

## EntityLink stores the hierarchy

The `Object` table has no `row_id` column. Four fields in `EntityLink` represent the relationship:

| parent_entity_type | parent_entity_id | child_entity_type | child_entity_id |
|---|---|---|---|
| location | 1 | row | 7 |
| row | 7 | rack | 42 |
| rack | 42 | object | 88 |

Here, location 1 contains row 7, which contains rack 42. Equipment 88 is linked to the rack without a U position, as may happen with zero-U equipment. Equipment occupying units is represented in `RackSpace`.

Entity types are also called realms. `rack` and `object` can reference the same `Object` record in different operations. Deletion therefore handles both realms.

`EntityLink` has no foreign key to `Object`. The application must validate parent/child existence and types and remove links when deleting entities. The unique constraint prevents duplicate links but does not prevent linking a rack to two different rows.

## AttributeValue stores height and ordering

This is a flexible attribute model: rather than adding an `Object` column for each property, the database stores values in another table.

| object_id | object_tid | attr_id | uint_value |
|---|---|---|---|
| 42 | 1560 | 27 | 42 |
| 42 | 1560 | 29 | 1 |

Attribute 27 represents height (42U here); attribute 29 represents rack order within the row. `object_tid` repeats the object type to participate in composite foreign keys. `Attribute` defines attributes, and `AttributeMap` defines which attributes apply to each object type.

The `AttributeValue` key is `(object_id, attr_id)`: each object has at most one value per attribute. On creation, the module stores height and calculates the next order within the row.

## RackSpace represents regions within each unit

Each U has three regions: `front`, `interior`, and `rear`. The composite key `(rack_id, unit_no, atom)` prevents duplicate records for the same region of the same unit.

| rack_id | unit_no | atom | state | object_id |
|---|---|---|---|---|
| 42 | 10 | front | T | 88 |
| 42 | 10 | interior | T | 88 |
| 42 | 10 | rear | T | 88 |

These three rows represent the same equipment at U10, rather than three occupied units. Occupancy therefore uses sets of unit numbers to remove duplicates.

The stored enum contains `A`, `U`, and `T`. Free positions are represented by absent records; RackTables constructs the free state `F` when reading, before overlaying existing records. Reference: [official rack reading implementation](https://github.com/RackTables/racktables/blob/master/wwwroot/inc/database.php#L746-L778).

The module returns:

- `occupied_units`: units with an assigned `object_id`;
- `unavailable_units`: units with any recorded region, including blocks without equipment;
- `free_units`: units with no record in any of their three regions.

Thus, `occupied_units` is a subset of `unavailable_units`. A blocked unit can be unavailable without containing equipment. This conservative free-unit rule suits devices requiring the full depth; availability of a specific region requires inspecting `getSpaces()`.

Records outside `1..height` do not count toward the occupancy summary but remain accessible through space queries for diagnosis.

## The Rack view is a query, not a write destination

The `Rack` view combines `Object`, attributes, thumbnail, row, and location to simplify reads. It does not store another copy of racks.

Its current definition uses an `INNER JOIN` with the row, causing racks without a row to disappear from the view. The repository reads base tables for details and returns null `row_id`, `row_name`, `location_id`, and `location_name` when relationships are missing. The view and database schema were not changed.

## Writes require transactions

Creating a rack writes `Object`, two `AttributeValue` records, `EntityLink`, and `ObjectHistory`. The transaction commits all writes together; if any fails, writes are rolled back.

Creation, updates, and deletion use `Serializable` isolation. `P2034` transaction conflicts are retried for up to three attempts. Queries with multiple reads use `RepeatableRead` for a consistent snapshot during the transaction.

The unique `asset_no` constraint continues to protect against concurrency. Both the preliminary check and a uniqueness violation during creation become `asset_conflict`, which the service maps to a 409 error.

## Deletion and history

The module prevents deleting racks with child entities in the `rack` or `object` realms, spaces assigned to objects, or spaces in state `T`. `A/U` records without objects are removed during deletion.

`FileLink` and `EntityLink` have no foreign key to `Object`; `TagStorage` also has no foreign key to the entity identified by its realm/ID. The repository explicitly removes these links in the appropriate realms. `RackSpace` has a rack foreign key without cascade and requires explicit removal. Other data, such as `AttributeValue` and `RackThumbnail`, has cascading foreign keys to `Object`.

Creation and updates record a copy of common fields in `ObjectHistory` within the same transaction. The service accepts `actor` as the second argument for creation and the third for updates, supplied by the authenticated user; without it, `user_name` is `NULL`. This actor is not part of the client DTO.

`ObjectHistory` has a foreign key with `onDelete: Cascade`. Physically deleting an object therefore also removes its history in this schema. Permanent deletion auditing requires separate storage or a deliberate change to this relationship. The snapshot also excludes attributes and links because `ObjectHistory` has no fields for them.

## Module contract and responsibilities

- DTO: validates names, IDs, height, asset numbers, space parameters, and pagination; rejects extra fields. Default height: 42U; operational limit: 1,000U to bound memory usage in per-unit responses. Legacy data with missing, invalid, or excessive height returns `RACK_HEIGHT_INVALID` (409) when querying occupancy.
- Service: validates inputs before persistence, maps domain results to application errors, and calculates occupancy outside the transaction.
- Repository: executes reads and writes, preserves atomicity, and returns the data needed by the service.

`getAll()` and `getOccupancyAll()` return `{ items, total, page, per_page }`. Defaults are page 1 and 50 racks; the limit is 100 racks per page. Occupancy listing uses four queries for a nonempty page: objects, total count, heights, and spaces. An empty page uses only objects and count.

Repository `getSpace()` returns a discriminated result: `rack_not_found` or `found` with the space (which can be null). The service preserves the public space-or-`null` result and throws 404 only when the rack does not exist.

The controller and router are still migration scaffolding. The module does not expose HTTP endpoints until these layers are implemented and registered in the app. Enriched layouts with objects (`include_objects`) are outside this contract.

## Local verification

```sh
node --import tsx --test --test-isolation=none tests/modules/racks/*.test.ts
npm run typecheck
```

Repository tests use substitute persistence clients without writing to a real database. They verify conflict handling, realm cleanup, limits, batched pagination, and history; they do not prove actual MariaDB constraint, rollback, or locking behavior.
