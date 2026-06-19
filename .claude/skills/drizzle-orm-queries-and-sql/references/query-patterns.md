# Query Patterns

## Read this when

- writing CRUD queries
- using joins, filters, operators, or aggregations
- deciding between partial select, relation queries, or SQL expressions

## Core query guidance

- Drizzle always lists selected columns explicitly instead of using `select *`.
- Partial selects are normal and can mix columns with SQL expressions.
- Filter operators are SQL expressions under the hood and parameterize values automatically.
- Use helpers like `count()` when possible instead of hand-writing the same raw SQL repeatedly.

## Common query surfaces

- `select`, `selectDistinct`, and partial selects
- `insert`, `update`, `delete`
- joins and subqueries
- filter operators and conditional filters
- order by, limit/offset, cursor pagination
- CTEs via `$with(...)`
- relation-aware queries via `db.query.<table>` or beta-line `db._query.<table>`

## Footguns

- If you use `sql<T>`, the generic is only a type hint. It does not transform the returned value.
- Aggregation values can need explicit casting or `.mapWith(Number)` depending on the driver.
- Alias SQL expressions used in CTEs and subqueries if they need to be referenced later.

## Source map

- `https://orm.drizzle.team/docs/data-querying`
- `https://orm.drizzle.team/docs/select`
- `https://orm.drizzle.team/docs/insert`
- `https://orm.drizzle.team/docs/update`
- `https://orm.drizzle.team/docs/delete`
- `https://orm.drizzle.team/docs/operators`
- `https://orm.drizzle.team/docs/joins`
- `https://orm.drizzle.team/docs/sql`
- `https://orm.drizzle.team/docs/query-utils`
- `https://orm.drizzle.team/docs/guides/conditional-filters-in-query`
- `https://orm.drizzle.team/docs/guides/count-rows`
