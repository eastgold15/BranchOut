# Drizzle Kit Command Reference

## Read this when

- you already know the task is Drizzle Kit-specific
- you need command-specific behavior or config expectations

## Commands and best-fit usage

- `generate`: diff Drizzle schema against prior snapshots and write SQL migration files.
- `migrate`: apply generated migrations and track them in the migrations table.
- `push`: diff current schema against the live database and apply changes directly.
- `pull`: introspect the database and generate Drizzle schema output.
- `export`: print SQL DDL for the current Drizzle schema so another tool can own execution.
- `check`: validate generated migration history consistency.
- `up`: upgrade existing snapshot folders to the newer internal format.
- `studio`: launch the local Drizzle Studio server.

## Useful config fields called out by the docs

- `dialect`
- `schema`
- `out`
- `dbCredentials`
- `schemaFilter`
- `tablesFilter`
- `extensionsFilters`
- `migrations.table`
- `migrations.schema`

## Good operational habits

- Keep config-file paths explicit in multi-env repos.
- Use filters deliberately for extension-owned tables such as PostGIS internals.
- Prefer config-file-driven setup over long CLI flag strings once a project is established.

## Source map

- `https://orm.drizzle.team/docs/drizzle-kit-generate`
- `https://orm.drizzle.team/docs/drizzle-kit-migrate`
- `https://orm.drizzle.team/docs/drizzle-kit-push`
- `https://orm.drizzle.team/docs/drizzle-kit-pull`
- `https://orm.drizzle.team/docs/drizzle-kit-export`
- `https://orm.drizzle.team/docs/drizzle-kit-check`
- `https://orm.drizzle.team/docs/drizzle-kit-up`
- `https://orm.drizzle.team/docs/drizzle-kit-studio`
