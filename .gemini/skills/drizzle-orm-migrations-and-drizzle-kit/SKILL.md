---
name: drizzle-orm-migrations-and-drizzle-kit
description: Manage Drizzle migrations and Drizzle Kit workflows. Use when tasks mention `drizzle.config.ts`, `defineConfig`, migration folders, introspection, `drizzle-kit generate`, `migrate`, `push`, `pull`, `export`, `check`, `up`, `studio`, multiple config files, schema filters, extension filters, or team migration conflict handling.
---

# Drizzle ORM Migrations and Drizzle Kit

Use this skill when the task is about schema rollout, migration generation, introspection, or Drizzle Kit configuration.

## Scope

- migration strategy choice
- `drizzle.config.ts` and CLI options
- SQL generation and application workflows
- introspection from existing databases
- migration consistency checks and snapshot upgrades
- Drizzle Studio launcher behavior

## Routing cues

- `drizzle-kit`, `drizzle.config.ts`, migration folder layout, introspection, Studio, or migration conflicts -> use this skill
- initial package install or upgrade routing -> use `drizzle-orm-overview-and-setup`
- schema declaration -> use `drizzle-orm-schema-and-relations`
- runtime-specific DB clients -> use `drizzle-orm-drivers-and-runtimes`
- query code, transactions, cache, or read replicas -> use `drizzle-orm-queries-and-sql`

## Default path

1. Read [references/migration-strategies.md](./references/migration-strategies.md) first.
2. If the task is command-specific, read [references/drizzle-kit-command-reference.md](./references/drizzle-kit-command-reference.md).
3. Choose the workflow intentionally: code-first `generate`/`migrate`, fast iteration `push`, db-first `pull`, or external-tool `export`.
4. Keep `schema`, `out`, credentials, and filters in sync between the real project structure and `drizzle.config.ts`.

## When to deviate

- Use `push` only when fast iteration or no-migration-file environments justify it.
- Use `pull` only when the database is the real source of truth.
- Use `export` when another system owns SQL execution but Drizzle still owns schema intent.
- Move to overview or schema skills when the problem is package/setup or model design rather than rollout mechanics.

## Quick example

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## Guardrails

- Prefer generated SQL migrations for auditable team workflows. Use `push` deliberately for fast iteration or non-migration-file environments.
- Use `check` when multiple developers or branches can create divergent migration histories.
- Use `pull` when the database is the source of truth and you need Drizzle schema from an existing DB.
- Use `export` when an external system owns SQL execution but Drizzle schema remains the source model.
- Keep multiple config files explicit for separate stages or databases instead of overloading one config.
- Treat `schemaFilter`, `tablesFilter`, and `extensionsFilters` as correctness controls, not cleanup afterthoughts.
- `drizzle-kit up` is part of the v1 upgrade path because the snapshot and migration-folder format changed.
- The docs describe local Drizzle Studio as free for local development, not as an OSS/self-hosted production surface.

## Avoid

- mixing `generate`/`migrate`, `push`, and external migration ownership without intent
- using one overloaded config for unrelated environments
- ignoring filters until after the wrong schema has been introspected or migrated
- treating local Studio as a production hosting surface

## Verification checklist

- the migration workflow is chosen intentionally
- config paths, credentials, and filters match the real project layout
- team-conflict or divergence checks are considered when relevant
- upgrade-path commands like `up` are used only in the proper context
- Studio usage is scoped correctly

## Canonical commands

- `drizzle-kit generate`
- `drizzle-kit migrate`
- `drizzle-kit push`
- `drizzle-kit pull`
- `drizzle-kit export`
- `drizzle-kit check`
- `drizzle-kit up`
- `drizzle-kit studio`

## Maintenance

- Snapshot date: 2026-03-10
- Package snapshot: `drizzle-kit@0.31.9` latest, beta tag `1.0.0-beta.16-ea816b6`

## References

- [references/migration-strategies.md](./references/migration-strategies.md)
- [references/drizzle-kit-command-reference.md](./references/drizzle-kit-command-reference.md)
