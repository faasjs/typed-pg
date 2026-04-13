# Testing Guide

When changing `typed-pg`, every behavior change should come with runtime tests, and public type
surface changes should come with type assertions.

## Use This Guide When

- adding or changing query-builder behavior
- changing public types or declaration merging behavior
- updating schema or migration helpers
- writing integration tests for `typed-pg` packages

## Default Workflow

1. Prefer `TypedPgVitestPlugin()` so Vitest boots a temporary database, provisions one database per
   worker when file parallelism is enabled, runs migrations, and clears table contents before each test.
2. Build clients from `process.env.DATABASE_URL` so production and test code share the same
   connection bootstrap path.
3. Add only the suite-specific setup or fixtures that the plugin does not already provide.
4. Pair runtime assertions with `expectTypeOf(...)` when a change affects inference.
5. Run `npm test` for behavior changes, and `npm run build` when exports or CLI entrypoints change.

## Minimal Example

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { TypedPgVitestPlugin } from 'typed-pg-dev/plugin'

export default defineConfig({
  plugins: [TypedPgVitestPlugin()],
})
```

```ts
import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'
import { createClient } from 'typed-pg'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('DATABASE_URL is required')

describe('users query', () => {
  const client = createClient(postgres(databaseUrl))

  afterAll(async () => {
    await client.quit()
  })

  it('selects rows', async () => {
    expect(await client.query('users')).toEqual([])
  })
})
```

## Rules

### 1. Every behavior change needs a test update

- Add a new test or update an existing one for every runtime behavior change.
- Prefer focused tests near the feature you changed instead of broad catch-all suites.

### 2. Public type changes need `expectTypeOf`

- Add or update type assertions when changing inference, overloads, or declaration merging.
- If a query-builder method changes result shape, test the inferred result type directly.

### 3. Put tests next to the feature area

- Query-builder clause and operator changes belong under `src/__tests__/query-builder/`.
- Schema behavior belongs under `src/schema-builder/__tests__/`.
- Migration behavior belongs under `src/migrator/__tests__/`.
- CLI behavior belongs under `src/cli/__tests__/`.

### 4. Keep tests isolated even without file parallelism

- The test runner uses `fileParallelism: false`, but tests should still clean up after themselves.
- Prefer `TypedPgVitestPlugin()` to reset rows automatically before each test.
- Create extra tables or fixture data explicitly when a suite goes beyond the default migrations.
- Do not rely on hidden state from another file.

### 5. Use `typed-pg-dev` through the Vitest plugin

- Prefer `TypedPgVitestPlugin()` for workspace test runs.
- Read the database connection string from `process.env.DATABASE_URL` in both production and tests.
- Keep lower-level database bootstrapping internal to the repo; public examples should only show the plugin.

## Review Checklist

- runtime behavior changes have test coverage
- public type changes have `expectTypeOf` coverage
- tests live in the feature area that changed
- suites either rely on the plugin reset or clean up their own extra tables/temp folders
- validation commands match the change surface

## Read Next

- [typed-pg-dev](../references/packages/typed-pg-dev/README.md)
- [Query Builder Guide](./query-builder.md)
- [Schema and Migration Guide](./schema-and-migrations.md)
