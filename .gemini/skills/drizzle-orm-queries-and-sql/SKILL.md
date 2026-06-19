---
name: drizzle-orm-queries-and-sql
description: Build and debug Drizzle ORM query code. Use when tasks mention `select`, `insert`, `update`, `delete`, joins, filter operators, `db.query`, `db._query`, partial selects, aggregations, pagination, `sql`, `.$dynamic()`, transactions, batch, cache, read replicas, or dynamic query-building helpers.
---

# Drizzle ORM Queries and SQL

Use this skill when the task is primarily about querying, mutating, or composing SQL with Drizzle’s query APIs.

## Scope

- SQL-like CRUD builders
- relation-aware query APIs
- joins, filters, aggregations, pagination, and set operations
- `sql` expressions and query utilities
- transactions, savepoints, batch, cache, and read replicas
- dynamic query-building helpers

## Routing cues

- `select`, `insert`, `update`, `delete`, joins, operators, `sql`, `count`, pagination, transactions, batch, or cache -> use this skill
- schema declaration, indexes, `relations`, `defineRelations`, views, or custom types -> use `drizzle-orm-schema-and-relations`
- runtime driver setup or provider-specific DB client initialization -> use `drizzle-orm-drivers-and-runtimes`
- `drizzle-kit` commands or migration strategy decisions -> use `drizzle-orm-migrations-and-drizzle-kit`
- validation schemas, seed, GraphQL, or lint rules -> use `drizzle-orm-ecosystem-and-extensions`

## Default path

1. Read [references/query-patterns.md](./references/query-patterns.md) first.
2. If the task touches transactions, batch, cache, read replicas, or query-builder reuse, read [references/advanced-query-features.md](./references/advanced-query-features.md).
3. Keep query style consistent with the surface already used in the repo: SQL-like builders, `db.query`, or beta-line `db._query`.
4. Use raw SQL escape hatches deliberately and keep types honest.

## When to deviate

- Use `.$dynamic()` only when the query builder actually needs multiple conditional passes.
- Reach for raw `sql` only when the normal builder cannot express the query clearly.
- Move to schema skill when the real problem is model ownership rather than query composition.

## Quick example

```ts
import { eq } from "drizzle-orm";

const rows = await db
  .select()
  .from(users)
  .where(eq(users.id, 1));
```

## Guardrails

- Drizzle deliberately mirrors SQL structure, so most builder methods can only be called once unless you opt into `.$dynamic()`.
- `sql<T>` only sets the expected TypeScript type. It does not cast runtime values. Use `.mapWith()` or query helpers when you need runtime conversion.
- Count and aggregation results can come back as strings in PostgreSQL or MySQL driver paths. Cast or map them intentionally.
- Distinguish stable `db.query.<table>` relational work from beta-line `db._query.<table>` APIs before refactoring.
- Cache is explicit by default. Do not assume hidden caching or invalidation.
- Batch support is driver-specific in the docs. Check compatibility before using `db.batch(...)`.

## Avoid

- mixing stable `db.query` and beta `db._query` assumptions casually
- assuming `sql<T>` changes runtime casting behavior
- using `.$dynamic()` before simpler query composition is exhausted
- assuming batch and cache semantics are universal across drivers

## Verification checklist

- the query surface matches the version line already in use
- raw SQL is justified and typed honestly
- count and aggregation result types are handled intentionally
- transaction, batch, cache, or replica behavior is driver-aware
- schema or migration concerns are routed out when they dominate

## Canonical APIs and helpers

- `db.select`, `db.insert`, `db.update`, `db.delete`
- `db.query.<table>`
- `db._query.<table>`
- `sql`
- filter operators like `eq`, `and`, `or`, `inArray`
- `.$dynamic()`
- `db.transaction(...)`
- `db.batch(...)`

## Maintenance

- Snapshot date: 2026-03-10
- Package snapshot: `drizzle-orm@0.45.1` latest, beta tag `1.0.0-beta.16-ea816b6`

## References

- [references/query-patterns.md](./references/query-patterns.md)
- [references/advanced-query-features.md](./references/advanced-query-features.md)
