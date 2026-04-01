# Query Builder Surface Specification

This reference captures the stable `QueryBuilder` surface that the skill assumes.

## Read Methods

- `select(...columns)`
- `where(...)`
- `orWhere(...)`
- `whereRaw(sql, ...params)`
- `orWhereRaw(sql, ...params)`
- `join(...)`
- `leftJoin(...)`
- `orderBy(column, direction?)`
- `orderByRaw(sql, ...params)`
- `limit(number)`
- `offset(number)`
- `count()`
- `first()`
- `pluck(column)`

## Write Methods

- `insert(values, { returning? })`
- `update(values, { returning? })`
- `delete()`
- `upsert(values, { conflict, update?, returning? })`

## Supported Operators

### Comparison

- `=`
- `!=`
- `<`
- `<=`
- `>`
- `>=`

### Array

- `IN`
- `NOT IN`

### Null

- `IS NULL`
- `IS NOT NULL`

### Pattern

- `LIKE`
- `ILIKE`
- `NOT LIKE`
- `NOT ILIKE`

### JSONB

- `@>`

## Execution Notes

1. `QueryBuilder` is thenable and executes through `client.raw(...)`.
2. Omitting `select(...)` means `SELECT *`.
3. JSONB partial selection uses `{ column, fields, alias? }`.
4. `join(table, left, right)` and `leftJoin(table, left, right)` default to `=`.
5. `orderBy(...)` accepts `ASC`, `DESC`, `asc`, and `desc`.
6. `update()` and `delete()` reject when there are no `where` conditions.
7. Raw clauses still support bound params and should keep values parameterized.
