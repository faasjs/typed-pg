# typed-pg-dev

`typed-pg-dev` provides PGlite-powered helpers for running `typed-pg` in
development and test environments without provisioning an external PostgreSQL
service.

## Installation

```bash
npm install -D typed-pg-dev
```

## Vitest

Use the bundled global setup to boot an in-memory PGlite socket server and
expose it through `DATABASE_URL`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['typed-pg-dev/vitest'],
  },
})
```

## Creating a `postgres.js` client for tests

```ts
import { createClient } from 'typed-pg'
import { createTestingPostgres } from 'typed-pg-dev'

const client = createClient(createTestingPostgres())
```

## Advanced usage

If you need to manage the lifecycle yourself, use `startPGliteServer()` or
`createVitestSetup()` from the main entrypoint.
