# Service and repository standardization implementation plan

**Goal:** Correct the audited inconsistencies across locations, rows, racks and objects.
**Architecture:** Services validate and translate repository outcomes into application errors. Repositories return explicit mutation results, null only for missing single records, and arrays for collections. A shared database operation helper retries serialization conflicts three times and wraps other failures with their cause.
**Scope:** User-approved audit corrections; preserve URLs, domain-specific results, pagination and equipment allocation rules. No database schema changes.

- [x] Write and run failing regression tests for locations creation without client ID, normalized inputs, listing delegation, missing records, database failures, metadata cleanup and transaction retries.
- [x] Introduce shared DatabaseOperationError and executeDatabaseOperation(operation, retryDelay); re-export error from existing module paths and replace duplicated retry logic.
- [x] Standardize locations entity/contracts, DTOs, repository and service to create/update/delete/get/getAll. Update controller/router consumers, preserving URLs and returning 200 on update.
- [x] Use shared validation at repository input boundaries consistently, keeping objects dynamic-attribute domain validation and results.
- [x] Update outdated row test method names, run all tests and typecheck, review the diff, and fix concrete regressions.

Verification commands: `npm run typecheck`; run each `tests/**/*.test.ts` with `node --import tsx`; `git diff --check`; targeted HTTP injection tests with fake repositories.

Verified: 135 tests passed, zero failing files; `npm run typecheck`, Prettier and `git diff --check` passed. Read-only code review found two object repository validation gaps; both were fixed and covered by regression tests.
