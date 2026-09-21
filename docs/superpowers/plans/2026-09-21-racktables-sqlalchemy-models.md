# RackTables SQLAlchemy Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a static SQLAlchemy 2.0 ORM model for every physical table in the live RackTables MariaDB schema.

**Architecture:** Read the authoritative schema from MariaDB metadata, convert it deterministically into typed declarative classes, and store the resulting 70 classes with their constraints in `app/database/models.py`. Keep the generator temporary, do not reflect at application startup, and validate the static result against a second read-only schema snapshot.

**Tech Stack:** Python 3, SQLAlchemy 2.0.54, MariaDB 10.6, Docker

**Spec:** `docs/superpowers/specs/2026-09-21-racktables-sqlalchemy-models-design.md`

## Global Constraints

- The running `rack_db` schema is the source of truth.
- Map exactly the 70 physical tables and exclude all 4 views.
- Do not change database schema or data.
- Preserve MariaDB types, signedness, nullability, defaults, auto-increment behavior, indexes, unique constraints, and foreign keys.
- Use `__mapper_args__["primary_key"]` for the 13 tables that have a unique index but no physical primary key.
- Keep `IPv4LB` unchanged even though its nullable unique-index columns cannot guarantee update/delete identity for every row.
- Do not infer `relationship()` properties.
- Do not create test files, per the user's explicit request.

---

### Task 1: Capture and normalize the live schema

**Files:**
- Create temporarily: `/tmp/racktables_model_generator.py`
- Create temporarily: `/tmp/racktables_schema.json`

**Interfaces:**
- Consumes: read-only `information_schema` queries executed inside `rack_db`.
- Produces: a normalized description of base tables, columns, indexes, foreign keys, and table options.

- [x] **Step 1: Export schema metadata**

Query `information_schema.TABLES`, `COLUMNS`, `STATISTICS`, `TABLE_CONSTRAINTS`, `KEY_COLUMN_USAGE`, and `REFERENTIAL_CONSTRAINTS`, filtering with `TABLE_SCHEMA = DATABASE()` and `TABLE_TYPE = 'BASE TABLE'`. Include ordinal positions so composite keys and indexes retain database order.

- [x] **Step 2: Assert snapshot invariants**

The normalizer must fail unless it sees 70 base tables and 314 columns, excludes `Location`, `Rack`, `RackObject`, and `Row`, and finds a stable unique index for every table without a physical primary key.

- [x] **Step 3: Checkpoint the normalized schema**

Print table, column, primary-key, unique-index, and foreign-key totals. Keep all generated intermediate files under `/tmp`, outside the repository.

### Task 2: Generate static SQLAlchemy 2.0 models

**Files:**
- Modify: `app/database/models.py`

**Interfaces:**
- Consumes: the normalized schema from Task 1.
- Produces: `Base: type[DeclarativeBase]` and 70 importable mapped classes.

- [x] **Step 1: Generate deterministic imports and base class**

Emit only required SQLAlchemy core and MySQL dialect imports, define `class Base(DeclarativeBase): pass`, and make repeated generation byte-for-byte stable.

- [x] **Step 2: Generate columns and physical constraints**

For each base table in alphabetical order, emit a PascalCase class, exact `__tablename__`, typed `Mapped` annotations, `mapped_column` definitions, physical primary keys, foreign keys, server defaults, nullability, comments, auto-increment behavior, unique constraints, indexes, and table options. Use explicit physical names whenever Python identifiers need sanitizing.

- [x] **Step 3: Add ORM-only identities for keyless tables**

For each of the 13 keyless tables, leave the underlying columns non-primary in `Table` metadata and add:

```python
__mapper_args__ = {
    "primary_key": (<unique indexed column attributes in index order>,),
}
```

Abort generation if a keyless table has no unique index. Accept the explicitly documented `IPv4LB` exception: its nullable `(object_id, vs_id)` identity supports queries and inserts, while ORM updates/deletes require both values to be non-null.

- [x] **Step 4: Format and inspect generated output**

Compile the module and inspect its imports, class count, reserved-name handling, composite constraints, binary address columns, enum/set types, timestamps, and server expressions.

### Task 3: Validate against the live database

**Files:**
- Modify if validation finds discrepancies: `app/database/models.py`

**Interfaces:**
- Consumes: `Base.metadata`, configured SQLAlchemy mappers, and a fresh read-only metadata snapshot.
- Produces: validated static ORM mappings with a discrepancy count of zero.

- [x] **Step 1: Validate Python and mapper configuration**

Run:

```bash
python -m py_compile app/database/models.py
python -c 'from sqlalchemy.orm import configure_mappers; from app.database.models import Base; configure_mappers(); print(len(Base.metadata.tables))'
```

Expected output from the second command: `70`.

- [x] **Step 2: Compare model metadata with a fresh database snapshot**

Compare exact table coverage, ordered column coverage, compiled MariaDB types, signedness, lengths, precision/scale, nullability, defaults, physical primary keys, indexes, unique constraints, and foreign-key targets. Treat only the documented ORM-only mapper identities as non-physical metadata.

- [x] **Step 3: Verify database remained unchanged**

Repeat the database counts and confirm 70 base tables, 4 views, 314 base-table columns, and unchanged constraint/index definitions.

- [x] **Step 4: Review repository diff**

Run `git diff --check`, inspect only `app/database/models.py` and planning documentation, and confirm no existing unrelated user changes were modified.
