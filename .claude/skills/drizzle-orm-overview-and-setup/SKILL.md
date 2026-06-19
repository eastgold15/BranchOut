---
name: drizzle-orm-overview-and-setup
description: Set up Drizzle ORM, choose the right Drizzle package surface, and route Drizzle work to the correct follow-up skill. Use when tasks mention Drizzle installation, first-time setup, `drizzle-orm`, `drizzle-kit`, `drizzle.config.ts`, version selection, upgrading to the v1 beta line, validator-package import moves, or deciding whether a task belongs to schema design, queries, drivers, migrations, or ecosystem extensions.
---

# Drizzle ORM Overview and Setup

Use this skill when the task is primarily about initial setup, package/version decisions, or routing Drizzle work to the correct follow-up surface.

## Scope

- first-time Drizzle setup and package selection
- official docs topology and pack routing
- stable vs beta version awareness
- initial `drizzle-orm` + `drizzle-kit` install decisions
- validator package migration awareness for the v1 beta line

## Routing cues

- install Drizzle, choose packages, pick stable vs beta, understand docs structure, or decide where a task belongs -> use this skill
- `pgTable`, `mysqlTable`, `sqliteTable`, `relations`, indexes, views, RLS, or schema design -> use `drizzle-orm-schema-and-relations`
- `select`, `insert`, `update`, `delete`, joins, operators, `sql`, transactions, batch, cache, or query builders -> use `drizzle-orm-queries-and-sql`
- driver imports, runtime-specific setup, Neon, D1, PGlite, Bun SQL, Expo SQLite, or HTTP proxying -> use `drizzle-orm-drivers-and-runtimes`
- `drizzle-kit` commands, migration workflows, introspection, Studio, or `drizzle.config.ts` tuning -> use `drizzle-orm-migrations-and-drizzle-kit`
- `drizzle-zod`, `drizzle-orm/zod`, `drizzle-seed`, `drizzle-graphql`, `eslint-plugin-drizzle`, or Prisma extension work -> use `drizzle-orm-ecosystem-and-extensions`

## Default path

1. Read [references/docs-map.md](./references/docs-map.md) first.
2. If the task mentions versions, the v1 beta line, or validator-package imports, read [references/package-and-upgrade-snapshot.md](./references/package-and-upgrade-snapshot.md).
3. Decide the primary surface before editing code: schema, queries, drivers, migrations, or ecosystem.
4. Keep setup decisions minimal and aligned with the exact runtime and migration strategy the project actually uses.

## When to deviate

- Stay on stable packages unless the project explicitly needs beta-only APIs or is already on the beta line.
- Escalate quickly to the owning skill once the task narrows to schema, queries, drivers, migrations, or ecosystem work.
- Treat validator import migration as a beta-line concern rather than a generic setup rule.

## Quick example

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
```

## Guardrails

- Treat the docs as two tracks: the current `latest` stable packages and the v1 beta/RC migration path.
- Do not mix stable-package assumptions with beta-only APIs like RQB v2 or the new validator import paths.
- If the project uses Drizzle Kit, keep the schema path and exported models aligned so Drizzle Kit can import the real schema.
- Prefer one clear migration strategy per environment instead of mixing `push`, generated SQL migrations, and external migration tools without intent.
- Route validator work carefully: the docs now deprecate separate validator packages on the beta line in favor of `drizzle-orm/<validator>` imports.

## Avoid

- mixing stable and beta assumptions casually
- staying in overview once the primary surface is clear
- treating validator import changes as universal across stable and beta
- drifting schema exports away from what Drizzle Kit expects to import

## Verification checklist

- stable vs beta posture is explicit
- the primary Drizzle surface is identified before coding
- runtime and migration strategy assumptions match the actual project
- validator import guidance matches the version line
- the task is routed to the owning sibling skill when it narrows

## Canonical packages and docs surfaces

- `drizzle-orm`
- `drizzle-kit`
- `drizzle-orm/zod`
- `drizzle-orm/valibot`
- `drizzle-orm/typebox`
- `drizzle-orm/arktype`

## Maintenance

- Snapshot date: 2026-03-10
- Package snapshot: `drizzle-orm@0.45.1` latest, `drizzle-kit@0.31.9` latest, beta tag `1.0.0-beta.16-ea816b6`

## References

- [references/docs-map.md](./references/docs-map.md)
- [references/package-and-upgrade-snapshot.md](./references/package-and-upgrade-snapshot.md)
