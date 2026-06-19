# Package And Upgrade Snapshot

## Stable package snapshot

- `drizzle-orm@0.45.1` latest, npm metadata updated 2026-03-10
- `drizzle-kit@0.31.9` latest, npm metadata updated 2026-03-10
- `drizzle-zod@0.8.3`
- `drizzle-typebox@0.3.3`
- `drizzle-valibot@0.4.2`
- `drizzle-seed@0.3.1`
- `drizzle-graphql@0.8.5`
- `eslint-plugin-drizzle@0.2.3`

## Beta track snapshot

- `drizzle-orm` and `drizzle-kit` publish a `beta` dist-tag that currently points to `1.0.0-beta.16-ea816b6`.
- The official v1 upgrade guide treats the release candidate line as a beta track with per-beta release notes.

## Upgrade cues that change routing

- The v1 upgrade docs move validator imports into `drizzle-orm` subpaths:
  - `drizzle-zod` -> `drizzle-orm/zod`
  - `drizzle-valibot` -> `drizzle-orm/valibot`
  - `drizzle-typebox` -> `drizzle-orm/typebox` or `drizzle-orm/typebox-legacy`
  - `drizzle-arktype` -> `drizzle-orm/arktype`
- The validator docs explicitly mark `drizzle-zod`, `drizzle-valibot`, `drizzle-typebox`, and `drizzle-arktype` as deprecated starting from `drizzle-orm@1.0.0-beta.15`.
- The v1 upgrade flow also calls out `drizzle-kit up` for the newer migration-folder format and RQB v2 migration work.

## Practical routing rule

- If a repo is on stable `latest`, prefer the stable package names already in use.
- If a repo is moving to the beta/v1 line, treat validator imports, migration-folder shape, and relation/query APIs as a coordinated upgrade.

## Source map

- `https://orm.drizzle.team/docs/upgrade-v1`
- `https://orm.drizzle.team/docs/zod`
- `https://orm.drizzle.team/docs/valibot`
- `https://orm.drizzle.team/docs/typebox`
- `https://orm.drizzle.team/docs/typebox-legacy`
- `https://orm.drizzle.team/docs/arktype`
