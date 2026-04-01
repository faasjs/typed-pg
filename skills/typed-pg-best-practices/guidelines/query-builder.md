# Query Builder Guide

When implementing or reviewing `typed-pg` query code, default to the fluent `QueryBuilder`
surface instead of handwritten SQL.

## Use This Guide When

- creating or updating `SELECT`, `INSERT`, `UPDATE`, `DELETE`, or `UPSERT` queries
- changing query-builder runtime behavior or type inference
- adding operators, joins, ordering, or JSONB selection
- reviewing whether a query can stay within the typed fluent API

## Default Workflow

1. Start from `client.query('<table>')`.
2. Keep the query in builder methods for `select`, `where`, `join`, `orderBy`, `limit`, and
   `offset`.
3. Narrow results with `select(...)`, `first()`, or `pluck(...)` when the caller does not need
   full rows.
4. Use `whereRaw`, `orWhereRaw`, or `orderByRaw` only for expressions the builder cannot
   represent directly.
5. If you change the query-builder surface, update both SQL generation and type-level coverage.

## Minimal Example

```ts
const rows = await client
  .query('users')
  .select('id', 'name', { column: 'metadata', fields: ['age'] })
  .leftJoin('profiles', 'users.id', 'profiles.user_id')
  .where('name', 'ILIKE', 'a%')
  .orderBy('id', 'ASC')
```

## Rules

### 1. Preserve fluent API and inference together

- A query-builder change is not done until runtime SQL and TypeScript inference both match.
- When adding or changing a clause, update the overloads or generics, the SQL builder, and the
  related runtime or type tests together.

### 2. Prefer typed clauses before raw SQL

- Use `where`, `orWhere`, `join`, `leftJoin`, `orderBy`, `count`, `first`, and `pluck` first.
- Prefer built-in operators for equality, ranges, arrays, pattern matching, and JSONB
  containment.
- Use raw clauses for expressions such as `CASE`, SQL functions, or predicates that do not map to
  the built-in surface.

### 3. Keep raw fragments parameterized

- Raw clause values SHOULD still go through placeholders and params.
- `rawSql` SHOULD only be used for trusted SQL fragments or identifiers that cannot be represented
  otherwise.
- Never interpolate end-user values into raw SQL strings.

### 4. Narrow result shapes intentionally

- Use `select(...)` to avoid fetching wider row shapes than needed.
- Use JSONB field selection when the caller only needs a subset of a JSONB column.
- Use `first()` for a single row and `pluck('<column>')` for a single column.

### 5. Keep write queries guarded

- `update()` and `delete()` MUST keep explicit `where` conditions.
- Do not remove or bypass the missing-where protection.
- When reviewing write queries, treat an unbounded mutation as a bug unless it is an explicit,
  deliberate migration or maintenance action.

### 6. Use `returning` only when the caller needs changed rows

- `insert`, `update`, and `upsert` return an empty result shape unless `returning` is requested.
- Keep `returning` columns explicit so the result type stays narrow and predictable.

## Review Checklist

- the query uses builder methods before falling back to raw SQL
- clause changes keep runtime SQL and inference in sync
- raw fragments still use parameters for values
- result shape is narrowed with `select`, `first`, or `pluck` when appropriate
- `update` and `delete` stay guarded by `where`
- query-builder changes include tests under `src/__tests__/query-builder/`

## Read Next

- [Query Builder Surface Specification](../references/specs/query-builder-surface.md)
- [Raw SQL and Client Guide](./raw-sql-and-client.md)
- [Testing Guide](./testing.md)
