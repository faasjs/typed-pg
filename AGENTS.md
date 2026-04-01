# AGENTS.md

## Project Snapshot

- `typed-pg` is a TypeScript-first PostgreSQL query builder and migration toolkit.
- The repository is managed as an npm workspace with `vite-plus`.
- Runtime requirements are `node >= 24` and `npm >= 11`.
- The published package lives in `packages/typed-pg`.
- Source code lives in `packages/typed-pg/src/`. Build artifacts are generated into `packages/typed-pg/dist/` and should not be edited by hand.
- The package ships both ESM and CJS builds through `vite-plus`, with entrypoints in `packages/typed-pg/src/index.ts` and `packages/typed-pg/src/cli/index.ts`.

## Repository Map

- `package.json`: workspace root managed by `vite-plus`.
- `vite.config.ts`: shared pack, test, lint, and format orchestration.
- `packages/typed-pg/package.json`: published package metadata.
- `packages/typed-pg/src/client.ts`: wraps `postgres` with query, transaction, raw SQL, and optional logging support.
- `packages/typed-pg/src/query-builder.ts`: the core fluent query API and most of the compile-time inference logic.
- `packages/typed-pg/src/schema-builder/`: DDL helpers used by migrations.
- `packages/typed-pg/src/migrator/index.ts`: migration runner for timestamped `.ts` files.
- `packages/typed-pg/src/cli/`: CLI commands for migration status, up/down, migrate, and migration file creation.
- `packages/typed-pg/src/types.ts`: declaration-merging surface for consumer-defined tables.
- `packages/typed-pg/src/__tests__/`: runtime and type-level tests.

## Local Workflow

- Install dependencies with `npm install`.
- Run tests with `npm test`.
- Run coverage in CI mode with `npm run ci`.
- Build the package with `npm run build`.
- Tests use the PGlite socket server started by `packages/typed-pg/src/__tests__/global-setup.ts`, so no external PostgreSQL instance is required.

## Change Guidelines

- Preserve the fluent, chainable API shape unless the task explicitly requires a breaking change.
- Keep runtime behavior and TypeScript inference in sync. If you add or change a query-builder feature, update both the SQL generation path and the related generic/overload types.
- When touching operators or clauses in `packages/typed-pg/src/query-builder.ts`, also update tests under `packages/typed-pg/src/__tests__/query-builder/`.
- Prefer parameterized SQL. If identifiers must be interpolated, use helpers such as `escapeIdentifier` or `rawSql` instead of manual string concatenation.
- Keep `Tables` declaration merging intact. `packages/typed-pg/src/__tests__/types.test.ts` shows the expected consumer extension pattern.
- `SchemaBuilder.run()` executes accumulated statements in a single transaction. Maintain that behavior unless a task explicitly changes migration semantics.
- Migration filenames are timestamp-based and compared lexically. Preserve sortable naming when changing CLI or migrator behavior.

## Testing Expectations

- Every behavior change should come with a test update or a new test.
- For public type-surface changes, add or update `expectTypeOf` assertions.
- For new schema or migration behavior, prefer tests in `packages/typed-pg/src/schema-builder/__tests__/` or `packages/typed-pg/src/migrator/__tests__/`.
- The Vitest config sets `fileParallelism: false`; keep tests isolated and avoid cross-file hidden dependencies anyway.

## Style Notes

- Follow the existing TypeScript and import style already used in nearby files.
- Formatting, linting, testing, and packing are orchestrated from `vite.config.ts`.
- Keep changes focused. Do not hand-edit generated output under `packages/typed-pg/dist/`.
- If a change affects public APIs, CLI behavior, or examples, update `README.md` too.

## Pre-PR Checklist

- Run `npm test` for behavior changes.
- Run `npm run build` when exports, build output, or CLI entrypoints change.
- Review `README.md`, `package.json`, and exported entrypoints when the public surface changes.
