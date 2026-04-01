# Testing Guide

When changing `typed-pg`, every behavior change should come with runtime tests, and public type
surface changes should come with type assertions.

## Use This Guide When

- adding or changing query-builder behavior
- changing public types or declaration merging behavior
- updating schema or migration helpers
- writing integration tests for `typed-pg` packages

## Default Workflow

1. Run tests with the bundled PGlite setup instead of provisioning an external PostgreSQL server.
2. Create clients with `createTestingPostgres()` in runtime tests.
3. Create or reset tables inside each suite so tests stay isolated.
4. Pair runtime assertions with `expectTypeOf(...)` when a change affects inference.
5. Run `npm test` for behavior changes, and `npm run build` when exports or CLI entrypoints change.

## Minimal Example

```ts
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { createClient } from 'typed-pg'
import { createTestingPostgres } from 'typed-pg-dev'

describe('users query', () => {
  const client = createClient(createTestingPostgres())

  beforeAll(async () => {
    await client.raw`CREATE TABLE users (id serial primary key, name text)`
  })

  afterAll(async () => {
    await client.raw`DROP TABLE users`
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
- Create, truncate, and drop tables explicitly.
- Do not rely on hidden state from another file.

### 5. Use `typed-pg-dev` for local database setup

- Prefer the bundled `typed-pg-dev/vitest` global setup for workspace test runs.
- Use `createTestingPostgres()` when a suite needs a `postgres.js` client directly.

## Review Checklist

- runtime behavior changes have test coverage
- public type changes have `expectTypeOf` coverage
- tests live in the feature area that changed
- suites create and clean up their own tables or temp folders
- validation commands match the change surface

## Read Next

- [typed-pg-dev](../references/packages/typed-pg-dev/README.md)
- [Query Builder Guide](./query-builder.md)
- [Schema and Migration Guide](./schema-and-migrations.md)
