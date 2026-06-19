# Advanced Query Features

## Read this when

- using transactions or nested savepoints
- building reusable query-builder helpers
- enabling batch, cache, or read replicas
- working across stable and beta query APIs

## Transactions

- Use `db.transaction(...)` for all-or-nothing multi-step work.
- Nested transactions create savepoints.
- The docs expose dialect-specific transaction config types for PostgreSQL, MySQL, SQLite, SingleStore, MSSQL, and CockroachDB.

## Dynamic query building

- Builder methods are single-use by default.
- Switch to `.$dynamic()` before passing a query builder through helper functions that add clauses later.

## Batch, cache, and replicas

- `db.batch(...)` is documented for LibSQL, Neon, and D1.
- Drizzle cache is opt-in by default. Global caching is a separate explicit mode.
- Read replicas are a dedicated advanced surface; keep read/write ownership obvious when introducing them.

## Version-sensitive relation/query note

- Stable docs still document `db.query.<table>`.
- The beta line adds RQB v2 / `db._query` and `defineRelations`.
- Treat those as coordinated query-and-schema upgrades rather than isolated syntax swaps.

## Source map

- `https://orm.drizzle.team/docs/rqb`
- `https://orm.drizzle.team/docs/rqb-v2`
- `https://orm.drizzle.team/docs/relations-v1-v2`
- `https://orm.drizzle.team/docs/transactions`
- `https://orm.drizzle.team/docs/batch-api`
- `https://orm.drizzle.team/docs/cache`
- `https://orm.drizzle.team/docs/read-replicas`
- `https://orm.drizzle.team/docs/dynamic-query-building`
- `https://orm.drizzle.team/docs/set-operations`
