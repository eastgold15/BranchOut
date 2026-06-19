# Validation And Schema Generation

## Read this when

- generating request/response schemas from Drizzle tables
- migrating validator imports during a beta/v1 upgrade
- choosing between Zod, Valibot, TypeBox, ArkType, or Effect Schema surfaces

## Durable rules

- The docs describe the same core pattern across validator integrations:
  - create select schema for DB responses
  - create insert schema for write payloads
  - create update schema for partial updates
- Refinements can extend the generated field schema or replace it entirely for a given column.
- Factory helpers exist for advanced cases like coercion or extended validator instances.

## Upgrade and deprecation note

- Starting from `drizzle-orm@1.0.0-beta.15`, the docs deprecate `drizzle-zod`, `drizzle-valibot`, `drizzle-typebox`, and `drizzle-arktype` in favor of first-class `drizzle-orm/*` subpath imports.
- The v1 upgrade guide maps old package imports to their new `drizzle-orm/*` equivalents.
- TypeBox has both `typebox` and `typebox-legacy` surfaces in the docs.

## Practical cautions

- Generated select schemas expect the full selected shape. Partial selects should be matched with a compatible schema or custom override.
- Update schemas should not accept generated columns like identity IDs unless you intentionally override behavior.
- Keep the chosen validator surface consistent within a repo to avoid needless mixed-validator maintenance.

## Source map

- `https://orm.drizzle.team/docs/zod`
- `https://orm.drizzle.team/docs/valibot`
- `https://orm.drizzle.team/docs/typebox`
- `https://orm.drizzle.team/docs/typebox-legacy`
- `https://orm.drizzle.team/docs/arktype`
- `https://orm.drizzle.team/docs/effect-schema`
- `https://orm.drizzle.team/docs/upgrade-v1`
