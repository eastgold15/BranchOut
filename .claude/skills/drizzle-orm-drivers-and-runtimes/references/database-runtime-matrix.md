# Database Runtime Matrix

## Read this when

- picking a Drizzle driver import
- setting up a new provider integration
- checking whether a task belongs to a runtime-specific guide

## Official guide families

- PostgreSQL: native Postgres plus Neon, Vercel Postgres, Supabase, Xata, Nile, Prisma Postgres, PlanetScale Postgres, AWS Data API Postgres, and Effect Postgres.
- MySQL: `mysql2`, PlanetScale MySQL, TiDB, AWS Data API MySQL.
- SQLite: LibSQL/Turso, SQLite Cloud, D1, Durable Objects, Bun SQLite, Expo SQLite, OP-SQLite, React Native SQLite.
- Embedded/local runtimes: PGlite and Bun SQL.
- Other supported SQL surfaces in the docs include SingleStore, MSSQL, CockroachDB, and Gel.

## Practical selection rule

- Start from the actual runtime or provider page.
- Copy the official client + Drizzle initialization pattern from that page.
- Only then layer project-specific wrappers on top.

## Source map

- `https://orm.drizzle.team/docs/connect-overview`
- `https://orm.drizzle.team/docs/get-started`
- `https://orm.drizzle.team/docs/connect-neon`
- `https://orm.drizzle.team/docs/connect-vercel-postgres`
- `https://orm.drizzle.team/docs/connect-supabase`
- `https://orm.drizzle.team/docs/connect-pglite`
- `https://orm.drizzle.team/docs/connect-bun-sql`
- `https://orm.drizzle.team/docs/connect-cloudflare-d1`
- `https://orm.drizzle.team/docs/connect-expo-sqlite`
- `https://orm.drizzle.team/docs/connect-op-sqlite`
- `https://orm.drizzle.team/docs/connect-aws-data-api-pg`
- `https://orm.drizzle.team/docs/connect-aws-data-api-mysql`
- `https://orm.drizzle.team/docs/connect-drizzle-proxy`
