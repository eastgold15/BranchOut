---
name: drizzle-orm-drivers-and-runtimes
description: Choose the right Drizzle ORM driver and runtime integration. Use when tasks mention `drizzle-orm/node-postgres`, `neon-http`, `mysql2`, `better-sqlite3`, `@libsql/client`, PGlite, Bun SQL, Cloudflare D1, Durable Objects, Expo SQLite, OP-SQLite, AWS Data API, serverless/edge runtimes, or Drizzle HTTP proxy setup.
---

# Drizzle ORM Drivers and Runtimes

Use this skill when the task is about selecting the correct connection path, import surface, or deployment/runtime integration for Drizzle.

## Scope

- driver and runtime selection
- provider-specific connection guides
- Node vs edge/serverless adapter choices
- DB client initialization patterns
- proxy-oriented connection flows
- performance-sensitive runtime setup cues

## Routing cues

- provider-specific connection guides, driver imports, D1, PGlite, Neon, Bun SQL, Expo SQLite, AWS Data API, or proxying -> use this skill
- install/version routing only -> use `drizzle-orm-overview-and-setup`
- schema models or relation declarations -> use `drizzle-orm-schema-and-relations`
- query composition or transactions -> use `drizzle-orm-queries-and-sql`
- migration commands or `drizzle.config.ts` -> use `drizzle-orm-migrations-and-drizzle-kit`

## Default path

1. Read [references/database-runtime-matrix.md](./references/database-runtime-matrix.md) first.
2. If the task is serverless, edge, proxy, or performance-sensitive, read [references/serverless-and-proxy-notes.md](./references/serverless-and-proxy-notes.md).
3. Match the runtime guide first, then adopt the import path and client example from that exact official guide.
4. Keep the chosen driver consistent across the app runtime and migration tooling.

## When to deviate

- Split connection factories when the project genuinely spans multiple runtimes with different adapter needs.
- Use proxy-oriented or HTTP paths only when the deployment model actually requires them.
- Move to migrations skill when the hard problem is config or rollout rather than runtime connection setup.

## Quick example

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });
```

## Guardrails

- Match driver imports to the actual runtime, not just the SQL dialect.
- Use the exact connect/get-started guide for the provider in front of you instead of porting assumptions across providers.
- Keep app runtime credentials and Drizzle Kit credentials aligned, but do not assume they share the same import surface.
- If a project spans local Node and edge/serverless runtimes, isolate the connection factories instead of forcing one adapter everywhere.
- Proxy-oriented or HTTP-based setups deserve their own connection guide; do not treat them as drop-in native-driver swaps.

## Avoid

- choosing the driver by dialect name alone without checking runtime constraints
- copying provider setup across runtimes casually
- forcing one adapter across incompatible runtimes
- treating proxy/HTTP drivers as trivial native-driver replacements

## Verification checklist

- the runtime and provider are identified first
- imports match the exact runtime guide
- app and migration tooling stay aligned
- multi-runtime apps isolate connection factories where needed
- proxy or HTTP setups are deliberate, not accidental

## Common runtime surfaces

- PostgreSQL and hosted Postgres providers
- MySQL and PlanetScale/TiDB
- SQLite, Turso, D1, Durable Objects, Bun SQLite, Expo SQLite, OP-SQLite
- PGlite and Bun SQL
- AWS Data API
- Drizzle HTTP proxy

## Maintenance

- Snapshot date: 2026-03-10
- Package snapshot: `drizzle-orm@0.45.1` latest

## References

- [references/database-runtime-matrix.md](./references/database-runtime-matrix.md)
- [references/serverless-and-proxy-notes.md](./references/serverless-and-proxy-notes.md)
