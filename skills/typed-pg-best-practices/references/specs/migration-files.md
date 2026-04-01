# Migration File Specification

This reference defines the migration-file contract assumed by `typed-pg`.

## Location

- Migration files live under the configured migration folder.
- The CLI defaults to the local `migrations/` directory.

## Filename Rules

1. Migration files MUST end with `.ts`.
2. Filenames MUST remain lexically sortable.
3. The normal pattern is `YYYYMMDDHHMMSS...-name.ts`.
4. Timestamp prefixes are the ordering mechanism; do not replace them with unsorted names.

## File Shape

Each migration file exports:

```ts
import type { SchemaBuilder } from 'typed-pg'

export function up(builder: SchemaBuilder) {}

export function down(builder: SchemaBuilder) {}
```

## Runtime Semantics

1. `Migrator` resolves the folder path up front and fails fast if it does not exist.
2. `migrate()` applies every pending `.ts` migration that is not recorded in
   `typed_pg_migrations`.
3. `up()` applies the next pending migration after the latest recorded migration.
4. `down()` rolls back the latest recorded migration by loading the matching file.
5. Applied migration names are stored in `typed_pg_migrations`.
6. Each migration normally uses `SchemaBuilder.run()` so batched DDL stays transactional.

## Authoring Guidelines

- Keep `up()` and `down()` deterministic.
- Prefer builder helpers before `raw()`.
- Keep names descriptive after the timestamp so migration intent is obvious in history.
