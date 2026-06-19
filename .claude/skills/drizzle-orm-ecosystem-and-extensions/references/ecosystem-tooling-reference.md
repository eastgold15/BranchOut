# Ecosystem Tooling Reference

## Read this when

- using deterministic seed data
- generating GraphQL from Drizzle schema
- adding Drizzle-specific lint protections
- checking adjacent extension and product surfaces

## `drizzle-seed`

- deterministic fake data generation via a seedable PRNG
- `seed(db, schema, options)` for population
- `reset(db, schema)` for cleanup/reset flows
- requires `drizzle-orm@0.36.4` or higher according to the official docs
- explicit `seed` and `version` options matter when reproducibility must survive generator changes
- the docs call out TypeScript limitations around `with`, so relation-heavy seeds may require manually choosing the right target table

## `drizzle-graphql`

- `buildSchema(db)` can produce a working GraphQL schema from Drizzle tables and relations
- the docs show extending generated `entities` rather than reimplementing everything from scratch
- requires a compatible `drizzle-orm` version; the docs call out `0.30.9` or higher
- relation-aware GraphQL examples rely on explicit Drizzle `relations(...)`

## `eslint-plugin-drizzle`

- focuses on `delete` and `update` safety with required `.where()` usage
- supports `plugin:drizzle/recommended` and `plugin:drizzle/all`
- use `drizzleObjectName` options when your codebase has other `.delete()` or `.update()` methods that are not Drizzle

## Studio package and Gateway

- local Drizzle Studio in normal app workflows is launched through `drizzle-kit studio`, which belongs to the migrations/tooling surface
- `@drizzle-team/studio` is the embeddable Studio package for product integration work
- Gateway is documented as a separate product surface and should be treated as product/tooling routing rather than a normal npm sublibrary
- keep these surfaces distinct when deciding whether the task is about local developer tooling, embedded product UI, or remote access/product architecture
- the Studio docs frame the hosted local Studio flow as local-development tooling, not remote VPS deployment
- Gateway docs call out persistent `/app` storage and environment variables like `PORT`, `STORE_PATH`, and `MASTERPASS`

## Other adjacent extension surfaces

- Prisma extension docs live alongside the ecosystem docs and should be treated as their own integration surface when relevant
- PostgreSQL extension docs cover things like `pg_vector` and PostGIS usage patterns that interact with schema and migration work
- Gateway and embeddable Studio are official Drizzle product surfaces even though they do not fit the same pattern as validator or seed packages

## Source map

- `https://orm.drizzle.team/docs/seed-overview`
- `https://orm.drizzle.team/docs/seed-functions`
- `https://orm.drizzle.team/docs/seed-versioning`
- `https://orm.drizzle.team/docs/graphql`
- `https://orm.drizzle.team/docs/eslint-plugin`
- `https://orm.drizzle.team/drizzle-studio/overview`
- `https://orm.drizzle.team/drizzle-gateway/overview`
- `https://gateway.drizzle.team/`
- `https://orm.drizzle.team/docs/prisma`
- `https://orm.drizzle.team/docs/extensions/pg`
