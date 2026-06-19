# Schema Design

## Read this when

- declaring or reorganizing Drizzle schema files
- choosing between aliases and `casing`
- editing tables, enums, schemas, views, or constraints

## Core schema rules from the docs

- Drizzle schema is the source of truth for future queries and migrations.
- You can keep schema in a single file or spread it across multiple files, but exported models must stay discoverable for Drizzle Kit.
- Table declarations are dialect-specific. There is no one shared table object across PostgreSQL, MySQL, and SQLite.
- TypeScript keys become SQL identifiers unless you provide explicit column names or use DB-level `casing` during Drizzle initialization.

## Durable patterns

- Keep schema under a predictable `src/db` or equivalent folder so both app code and Drizzle Kit point at the same place.
- Use explicit aliases when only a few columns need DB names that differ from TypeScript names.
- Use `casing: 'snake_case'` or the project’s preferred convention when the whole schema follows a consistent mapping.
- Reuse shared column fragments intentionally for repeated timestamp or audit fields.

## Important footguns

- If a model is not exported, Drizzle Kit cannot include it in migration diffing.
- MySQL schemas/databases can be expressed in Drizzle queries, but Drizzle Kit does not manage them in the migration flow.
- SQLite has no schema namespace concept, so keep everything in the single DB-file context.

## Source map

- `https://orm.drizzle.team/docs/sql-schema-declaration`
- `https://orm.drizzle.team/docs/schemas`
- `https://orm.drizzle.team/docs/indexes-constraints`
