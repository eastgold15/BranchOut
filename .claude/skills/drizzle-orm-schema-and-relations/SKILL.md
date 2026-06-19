---
name: drizzle-orm-schema-and-relations
description: Design and maintain Drizzle ORM schemas and relation definitions. Use when tasks mention `pgTable`, `mysqlTable`, `sqliteTable`, `pgSchema`, column types, indexes, constraints, sequences, views, RLS, custom types, `relations()`, `defineRelations()`, `db.query`, `db._query`, soft relations, or schema organization and naming.
---

# Drizzle ORM Schema and Relations

Use this skill when the task is about schema declaration, relation modeling, or the ownership of database structure in Drizzle.

## Scope

- dialect-specific table and column declaration
- schema organization across one or many files
- aliases, casing, and naming conventions
- indexes, constraints, views, sequences, and RLS
- soft relations and relational-query schema definitions
- beta-only relation-modeling changes like `defineRelations`

## Routing cues

- `pgTable`, `mysqlTable`, `sqliteTable`, column types, `pgSchema`, constraints, views, `relations`, `defineRelations`, or `casing` -> use this skill
- query composition, CRUD, filters, joins, transactions, cache, or `sql` -> use `drizzle-orm-queries-and-sql`
- database connection setup or runtime-specific drivers -> use `drizzle-orm-drivers-and-runtimes`
- migration generation, introspection, or `drizzle.config.ts` -> use `drizzle-orm-migrations-and-drizzle-kit`
- Zod/Valibot/TypeBox schema generation, seed, GraphQL, or ESLint plugin -> use `drizzle-orm-ecosystem-and-extensions`

## Default path

1. Read [references/schema-design.md](./references/schema-design.md) first.
2. If the task touches relations, advanced schema entities, or beta-only relation APIs, read [references/relations-and-advanced-schema.md](./references/relations-and-advanced-schema.md).
3. Keep schema shape, relation definitions, and migration expectations consistent across the same dialect.
4. Distinguish database-enforced foreign keys from Drizzle’s soft-relation/query helpers.

## When to deviate

- Use beta-line relation APIs only when the project is intentionally on that version line.
- Split schema files only when the schema size or team workflow justifies it.
- Move to migrations skill when the real question is rollout, introspection, or config rather than schema design.

## Quick example

```ts
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));
```

## Guardrails

- Always use the dialect-specific core module that matches the database you are targeting.
- If Drizzle Kit is part of the workflow, export every table, enum, view, sequence, and schema model that migrations should see.
- Choose either explicit aliases or DB-level `casing` conventions deliberately; do not mix styles casually.
- PostgreSQL schemas are first-class in Drizzle and Drizzle Kit. MySQL “schemas/databases” can be declared in Drizzle but are not managed by Drizzle Kit migrations.
- Treat `relations()`/`db.query.<table>` and `defineRelations()`/`db._query.<table>` as version-sensitive surfaces. The docs mark the newer relation flow as beta-line work.
- Use soft relations for query ergonomics, but keep actual foreign key behavior represented in the schema when the database should enforce it.

## Avoid

- mixing dialect-specific core modules casually
- assuming soft relations replace real foreign keys
- using beta-only relation APIs in stable projects
- letting schema declarations drift away from what migrations need to see

## Verification checklist

- the dialect-specific core module matches the target database
- schema exports cover what Drizzle Kit must see
- soft relations and enforced constraints are distinguished
- stable vs beta relation APIs are not mixed
- schema design and migration expectations stay aligned

## Canonical APIs and concepts

- `pgTable`, `mysqlTable`, `sqliteTable`
- `pgSchema`, `mysqlSchema`
- `relations`
- `defineRelations`
- `index`, `uniqueIndex`, `primaryKey`
- views, sequences, RLS, custom types

## Maintenance

- Snapshot date: 2026-03-10
- Package snapshot: `drizzle-orm@0.45.1` latest, beta tag `1.0.0-beta.16-ea816b6`

## References

- [references/schema-design.md](./references/schema-design.md)
- [references/relations-and-advanced-schema.md](./references/relations-and-advanced-schema.md)
