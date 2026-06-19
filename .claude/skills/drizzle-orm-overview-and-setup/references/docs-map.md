# Drizzle Docs Map

## Read this when

- setting up Drizzle for the first time
- deciding which Drizzle skill or doc slice to use
- mapping a task to schema, query, runtime, migration, or extension work

## Top-level docs surfaces

- `Get started`: onboarding by database and by new-vs-existing project flow.
- `Fundamentals`: schema declaration, relations fundamentals, connection basics, CRUD, and migration fundamentals.
- `Connect`: runtime- and provider-specific connection guides like Neon, D1, PGlite, Expo SQLite, Bun SQL, and AWS Data API.
- `Manage schema`: dialect column types, indexes and constraints, schemas, views, sequences, RLS, extensions, and relations.
- `Migrations`: Drizzle Kit overview, config, and individual commands like `generate`, `migrate`, `push`, `pull`, `export`, `check`, `up`, and `studio`.
- `Access your data`: relational query APIs, SQL-like CRUD, joins, operators, and the `sql` operator.
- `Advanced`: transactions, batch, cache, dynamic query building, read replicas, and custom types.
- `Validations`: Zod, Valibot, TypeBox, ArkType, Effect Schema, and legacy TypeBox notes.
- `Extensions`: Prisma extension, ESLint plugin, and `drizzle-graphql`.
- `Seeding`: `drizzle-seed`, generators, deterministic versioning, and reset flows.

## Recommended skill routing

- setup/package choice/upgrade questions -> `drizzle-orm-overview-and-setup`
- schema declaration or relations -> `drizzle-orm-schema-and-relations`
- CRUD, joins, `sql`, transactions, cache, batch -> `drizzle-orm-queries-and-sql`
- runtime-specific driver imports or serverless adapters -> `drizzle-orm-drivers-and-runtimes`
- `drizzle-kit`, migrations, introspection, Studio -> `drizzle-orm-migrations-and-drizzle-kit`
- validation generators, seed, GraphQL, linting, Prisma extension -> `drizzle-orm-ecosystem-and-extensions`

## Source map

- `https://orm.drizzle.team/llms.txt`
- `https://orm.drizzle.team/docs/get-started`
- `https://orm.drizzle.team/docs/overview`
- `https://orm.drizzle.team/docs/gotchas`
