# Migration Strategies

## Read this when

- deciding between `push`, generated SQL migrations, introspection, or export
- setting up `drizzle.config.ts`
- handling team migration conflicts

## Strategy selection

- `generate` + `migrate`: best when you want SQL files, reviewability, and durable team history.
- `push`: best for fast local iteration or environments where you intentionally skip migration files.
- `pull`: best when an existing database is the source of truth and you want Drizzle schema from introspection.
- `export`: best when Drizzle defines schema but another tool executes or manages migrations.

## Team workflow cues

- Use `check` to detect migration-history consistency problems across branches.
- Keep separate config files for separate DBs or stages.
- Keep schema exports complete so Drizzle Kit sees the whole intended model.

## Beta/v1 upgrade notes

- `drizzle-kit up` upgrades older snapshot formats.
- The v1 upgrade guide explicitly calls out the new migration-folder structure and validator import moves.
- The upgrade docs also note that MySQL schemas/databases are no longer handled by Drizzle Kit in the migration flow.

## Source map

- `https://orm.drizzle.team/docs/migrations`
- `https://orm.drizzle.team/docs/kit-overview`
- `https://orm.drizzle.team/docs/drizzle-config-file`
- `https://orm.drizzle.team/docs/kit-migrations-for-teams`
- `https://orm.drizzle.team/docs/kit-web-mobile`
- `https://orm.drizzle.team/docs/upgrade-v1`
