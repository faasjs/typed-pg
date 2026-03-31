# AGENTS.md

## Project Snapshot

- `typed-pg` is a TypeScript-first PostgreSQL query builder and migration toolkit.
- Runtime requirements are `node >= 24` and `npm >= 11`.
- Source code lives in `src/`. Build artifacts are generated into `dist/` and should not be edited by hand.
- The package ships both ESM and CJS builds through `tsup`, with entrypoints in `src/index.ts` and `src/cli/index.ts`.

## Repository Map

- `src/client.ts`: wraps `postgres` with query, transaction, raw SQL, and optional logging support.
- `src/query-builder.ts`: the core fluent query API and most of the compile-time inference logic.
- `src/schema-builder/`: DDL helpers used by migrations.
- `src/migrator/index.ts`: migration runner for timestamped `.ts` files.
- `src/cli/`: CLI commands for migration status, up/down, migrate, and migration file creation.
- `src/types.ts`: declaration-merging surface for consumer-defined tables.
- `src/__tests__/`: runtime and type-level tests.

## Local Workflow

- Install dependencies with `npm install`.
- Run tests with `npm test`.
- Run coverage in CI mode with `npm run ci`.
- Build the package with `npm run build`.
- Tests use the PGlite socket server started by `src/__tests__/global-setup.ts`, so no external PostgreSQL instance is required.

## Change Guidelines

- Preserve the fluent, chainable API shape unless the task explicitly requires a breaking change.
- Keep runtime behavior and TypeScript inference in sync. If you add or change a query-builder feature, update both the SQL generation path and the related generic/overload types.
- When touching operators or clauses in `src/query-builder.ts`, also update tests under `src/__tests__/query-builder/`.
- Prefer parameterized SQL. If identifiers must be interpolated, use helpers such as `escapeIdentifier` or `rawSql` instead of manual string concatenation.
- Keep `Tables` declaration merging intact. `src/__tests__/types.test.ts` shows the expected consumer extension pattern.
- `SchemaBuilder.run()` executes accumulated statements in a single transaction. Maintain that behavior unless a task explicitly changes migration semantics.
- Migration filenames are timestamp-based and compared lexically. Preserve sortable naming when changing CLI or migrator behavior.

## Testing Expectations

- Every behavior change should come with a test update or a new test.
- For public type-surface changes, add or update `expectTypeOf` assertions.
- For new schema or migration behavior, prefer tests in `src/schema-builder/__tests__/` or `src/migrator/__tests__/`.
- The Vitest config sets `fileParallelism: false`; keep tests isolated and avoid cross-file hidden dependencies anyway.

## Style Notes

- Follow the existing TypeScript and import style already used in nearby files.
- Formatting and linting conventions come from `biome.json`, which extends `@faasjs/lint/biome`.
- Keep changes focused. Do not hand-edit generated output under `dist/`.
- If a change affects public APIs, CLI behavior, or examples, update `README.md` too.

## Pre-PR Checklist

- Run `npm test` for behavior changes.
- Run `npm run build` when exports, build output, or CLI entrypoints change.
- Review `README.md`, `package.json`, and exported entrypoints when the public surface changes.
