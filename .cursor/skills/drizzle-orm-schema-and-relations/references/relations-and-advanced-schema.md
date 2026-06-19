# Relations And Advanced Schema

## Read this when

- defining `relations()` or `defineRelations()`
- modeling foreign keys or many-to-many joins
- using views, sequences, RLS, or extension-backed column types

## Relation guidance

- Start with actual foreign keys and normalized tables.
- Use Drizzle relations to make relational queries concise and typed.
- Keep relation definitions colocated with the tables they describe, or in a single aggregated relation module if the project prefers that.

## Version-sensitive note

- The docs include both the older relational-query surface and the newer v2/beta relation flow.
- If a task references `defineRelations` or `db._query`, treat it as beta-line work and confirm the repo is on the compatible version track before migrating code.

## Advanced schema surfaces

- indexes and constraints
- sequences
- views and materialized views
- row-level security
- extension-backed types like vector or PostGIS geometry
- custom type definitions

## Footguns

- Soft relations help query ergonomics but do not replace DB constraints.
- Extension-backed tables may need explicit migration/config filters elsewhere in the stack.
- Relation migrations and query migrations should move together when adopting the v2/beta relation surface.

## Source map

- `https://orm.drizzle.team/docs/relations-schema-declaration`
- `https://orm.drizzle.team/docs/relations`
- `https://orm.drizzle.team/docs/relations-v2`
- `https://orm.drizzle.team/docs/relations-v1-v2`
- `https://orm.drizzle.team/docs/views`
- `https://orm.drizzle.team/docs/sequences`
- `https://orm.drizzle.team/docs/rls`
- `https://orm.drizzle.team/docs/custom-types`
- `https://orm.drizzle.team/docs/extensions/pg`
