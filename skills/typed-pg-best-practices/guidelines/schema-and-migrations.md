# Schema and Migration Guide

When implementing or reviewing DDL in `typed-pg`, default to `SchemaBuilder`, `TableBuilder`, and
timestamped migration files.

## Use This Guide When

- creating or updating migrations
- changing tables, columns, indexes, or constraints
- reviewing `SchemaBuilder` or `TableBuilder` behavior
- deciding whether a schema change should use builder helpers or raw SQL

## Default Workflow

1. Create a timestamped `.ts` migration file, usually with `typed-pg new <name>`.
2. Implement `up(builder)` with `SchemaBuilder` and `TableBuilder` helpers first.
3. Implement `down(builder)` for rollback when practical.
4. Keep related DDL in one builder run so it stays transactional.
5. Fall back to `raw()` only for SQL the current helpers do not support.

## Minimal Example

```ts
import type { SchemaBuilder } from 'typed-pg'

export function up(builder: SchemaBuilder) {
  builder.createTable('users', (table) => {
    table.string('id').primary()
    table.string('name')
    table.jsonb('metadata').defaultTo('{}')
    table.timestamps()
    table.index('name')
  })
}

export function down(builder: SchemaBuilder) {
  builder.dropTable('users')
}
```

## Rules

### 1. Keep migration filenames lexically sortable

- Migration files MUST remain timestamp-based and sortable by filename.
- Avoid custom naming schemes that break lexical ordering.
- Prefer the generated CLI naming pattern unless there is a strong reason not to.

### 2. Prefer builder helpers over handwritten DDL

- Use `createTable`, `alterTable`, `renameTable`, `dropTable`, and `TableBuilder` column helpers
  first.
- Use `specificType(...)` when the schema needs a PostgreSQL type not covered by a built-in helper.
- Use raw DDL only for unsupported features or carefully scoped one-off statements.

### 3. Preserve transactional schema execution

- `SchemaBuilder.run()` executes accumulated statements in a single transaction.
- Write migrations assuming the batch should succeed or fail as one unit.
- Do not split one logical schema change across unrelated builder runs unless partial application is
  intentional.

### 4. Keep migrations deterministic and reversible

- `up` and `down` should be direct, readable descriptions of the schema transition.
- Avoid time-sensitive or environment-sensitive SQL inside migrations unless it is explicitly
  required.
- Prefer reversible changes when practical so `down()` can restore the previous state.

### 5. Keep migration history semantics stable

- `typed_pg_migrations` is the source of migration history.
- `migrate()` applies all pending files, `up()` applies the next pending file, and `down()` rolls
  back the latest recorded file.
- Changes to migrator behavior should preserve those mental models unless the feature explicitly
  redefines them.

## Review Checklist

- migration file name remains timestamp-sorted
- `up` and `down` are both present and easy to reason about
- builder helpers are used before raw DDL
- schema changes expect `SchemaBuilder.run()` to be atomic
- migration or schema changes include tests under `schema-builder` or `migrator`

## Read Next

- [Migration File Specification](../references/specs/migration-files.md)
- [Testing Guide](./testing.md)
- [typed-pg](../references/packages/typed-pg/README.md)
