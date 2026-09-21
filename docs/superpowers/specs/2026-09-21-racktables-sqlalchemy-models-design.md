# RackTables SQLAlchemy Models Design

## Goal

Represent every physical table in the live RackTables MariaDB schema as a static SQLAlchemy 2.0 declarative model in `app/database/models.py`, suitable for reading and writing existing RackTables data.

## Source of truth

The schema in the running `rack_db` Docker container is authoritative. It currently contains 70 base tables, 4 views, 314 table columns, and 69 foreign-key constraints. Generation and validation must be read-only and must not modify database objects or rows.

## Scope

- Define one ORM class for each of the 70 `BASE TABLE` objects.
- Exclude the `Location`, `Rack`, `RackObject`, and `Row` views.
- Keep all models and the declarative base in `app/database/models.py`.
- Preserve physical table and column names.
- Preserve MariaDB data types, lengths, precision, signedness, nullability, server defaults, auto-increment behavior, indexes, unique constraints, foreign keys, and relevant table options.
- Use SQLAlchemy 2.0 typed declarative syntax with `Mapped` and `mapped_column`.
- Do not add inferred `relationship()` properties. Foreign-key columns and constraints provide the reliable schema mapping without guessing domain-level relationship semantics.

## Tables without declared primary keys

Thirteen legacy tables lack a physical `PRIMARY KEY`: `AttributeMap`, `IPv4LB`, `LDAPCache`, `ObjectParentCompat`, `PortCompat`, `PortInterfaceCompat`, `RackThumbnail`, `TagStorage`, `UserConfig`, `VLANIPv4`, `VLANIPv6`, `VLANSTRule`, and `VLANSwitch`.

Each has a unique index. Its unique-index columns will be supplied through `__mapper_args__["primary_key"]` so SQLAlchemy has an identity key without adding a physical constraint. The corresponding `Column` objects will not be marked `primary_key=True`; therefore the SQLAlchemy table metadata will not claim that the database has a physical primary-key constraint.

`IPv4LB` is the exception to complete CRUD support: its only unique index is `(object_id, vs_id)`, and both columns are nullable. MariaDB can therefore contain rows without a stable unique identity, and SQLAlchemy cannot safely update or delete instances whose mapper identity includes `NULL`. The model will remain faithful to the existing schema and will support queries and inserts; updates and deletes are only reliable when both identity columns are non-null. No database migration will be introduced.

## Naming and typing

- Class names will be valid PascalCase Python identifiers derived from exact table names.
- Column attribute names will retain their database names when valid Python identifiers. Any collision with Python or SQLAlchemy reserved names will use a safe Python attribute with the physical name passed explicitly to `mapped_column`.
- Nullable columns will use optional Python types.
- MariaDB-specific types will use `sqlalchemy.dialects.mysql` where generic SQLAlchemy types cannot preserve the schema exactly.
- Database-side expressions will remain server defaults rather than Python-side defaults.

## Validation

No test files will be created, at the user's request. Validation will instead:

1. Compile `app/database/models.py` and import every mapped class.
2. Ask SQLAlchemy to configure all mappers, catching missing or invalid identities and foreign-key declarations.
3. Compare the resulting metadata against read-only `information_schema` data for table coverage, columns, types, nullability, defaults, indexes, unique constraints, and foreign keys.
4. Confirm that the database remains unchanged.

## Non-goals

- Mapping views.
- Creating or migrating schema objects.
- Altering RackTables data.
- Adding repositories, services, endpoints, or Pydantic schemas.
- Creating automated tests.
- Inferring domain relationships beyond the foreign keys declared by MariaDB.
