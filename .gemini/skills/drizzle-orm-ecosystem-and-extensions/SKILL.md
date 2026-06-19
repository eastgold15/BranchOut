---
name: drizzle-orm-ecosystem-and-extensions
description: Use Drizzle ORM companion libraries and extension surfaces. Use when tasks mention `drizzle-zod`, `drizzle-orm/zod`, `drizzle-valibot`, `drizzle-typebox`, `drizzle-arktype`, `drizzle-seed`, `drizzle-graphql`, `eslint-plugin-drizzle`, `@drizzle-team/studio`, Drizzle Gateway, Drizzle Prisma extension, validator import migration, schema generation for API validation, deterministic seeding, or GraphQL schema generation from Drizzle tables.
---

# Drizzle ORM Ecosystem and Extensions

Use this skill when the task is about Drizzle’s validator generators, seed tooling, GraphQL helpers, lint rules, Studio product surfaces, Gateway, or extension-style integrations around the ORM core.

## Scope

- Zod, Valibot, TypeBox, ArkType, and Effect Schema generation
- validator-package deprecation and import migration
- deterministic fake-data generation with `drizzle-seed`
- GraphQL schema generation with `drizzle-graphql`
- ESLint rule setup for destructive query safety
- embeddable Studio package and Gateway product routing
- Prisma extension routing

## Routing cues

- `drizzle-zod`, `drizzle-orm/zod`, `drizzle-valibot`, `drizzle-typebox`, `drizzle-arktype`, `drizzle-seed`, `drizzle-graphql`, `eslint-plugin-drizzle`, `@drizzle-team/studio`, or Drizzle Gateway -> use this skill
- initial Drizzle install or stable-vs-beta routing -> use `drizzle-orm-overview-and-setup`
- schema modeling or relation declaration -> use `drizzle-orm-schema-and-relations`
- query code and transactions -> use `drizzle-orm-queries-and-sql`
- migration strategy or `drizzle-kit` config -> use `drizzle-orm-migrations-and-drizzle-kit`

## Default path

1. Read [references/validation-and-schema-generation.md](./references/validation-and-schema-generation.md) first.
2. If the task touches seed, GraphQL, ESLint, Studio package work, Gateway, or Prisma extension work, read [references/ecosystem-tooling-reference.md](./references/ecosystem-tooling-reference.md).
3. Check whether the repo is on stable or beta before changing imports for validator packages.
4. Keep ecosystem utilities aligned with the underlying schema and query surfaces instead of duplicating model logic manually.

## When to deviate

- Keep separate validator packages only when the project intentionally stays on the older stable path.
- Add seed, GraphQL, or lint tooling only when the project really needs that surface.
- Treat Gateway and embeddable Studio as product-surface decisions, not default dev dependencies.

## Quick example

```ts
import { createInsertSchema } from "drizzle-orm/zod";

const insertUserSchema = createInsertSchema(users);
const user = insertUserSchema.parse({ name: "Ada" });
```

## Guardrails

- On the beta line, the docs deprecate separate validator packages in favor of `drizzle-orm/<validator>` imports.
- Select schemas validate the shape of returned rows. They will fail if your query only selected a subset of required columns.
- Insert and update schemas intentionally reject missing required fields or generated columns that should not be written.
- `drizzle-seed` is deterministic by design; preserve explicit `seed` and `version` choices when reproducibility matters.
- `drizzle-seed` `with` support is documented for one-to-many generation patterns, not arbitrary inverse traversal.
- `drizzle-graphql` expects a compatible Drizzle version and can be extended by reusing generated entities rather than replacing everything.
- `eslint-plugin-drizzle` is about protecting destructive `update` and `delete` calls. Scope it to your real Drizzle object names when needed.
- Keep local `drizzle-kit studio` usage separate from the embeddable `@drizzle-team/studio` package and Gateway product surfaces.
- Treat Gateway as a product/documentation surface, not as a normal public npm subpackage.

## Avoid

- changing validator imports without checking stable vs beta context
- duplicating schema logic outside the core Drizzle model
- assuming generated select schemas work against partial row selections
- treating Studio, Gateway, and local studio commands as the same surface

## Verification checklist

- stable vs beta validator import path is explicit
- generated schemas align with the real Drizzle models
- seed, GraphQL, and lint tooling are added only for a real need
- Studio/Gateway/product surfaces are not conflated
- ecosystem tooling stays aligned with underlying schema and query code

## Canonical APIs and packages

- `createSelectSchema`, `createInsertSchema`, `createUpdateSchema`
- `createSchemaFactory`
- `seed`, `reset`
- `buildSchema`
- `plugin:drizzle/recommended`
- `@drizzle-team/studio`

## Maintenance

- Snapshot date: 2026-03-10
- Package snapshot: `drizzle-zod@0.8.3`, `drizzle-typebox@0.3.3`, `drizzle-valibot@0.4.2`, `drizzle-seed@0.3.1`, `drizzle-graphql@0.8.5`, `eslint-plugin-drizzle@0.2.3`, `@drizzle-team/studio@1.0.3`

## References

- [references/validation-and-schema-generation.md](./references/validation-and-schema-generation.md)
- [references/ecosystem-tooling-reference.md](./references/ecosystem-tooling-reference.md)
