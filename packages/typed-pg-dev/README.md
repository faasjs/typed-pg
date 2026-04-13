# typed-pg-dev

`typed-pg-dev` exposes `TypedPgVitestPlugin`, a PGlite-powered Vitest plugin for
running `typed-pg` suites without provisioning an external PostgreSQL service.

## Installation

```bash
npm install -D typed-pg-dev
```

## Vitest

```ts
import { defineConfig } from 'vitest/config'
import { TypedPgVitestPlugin } from 'typed-pg-dev/plugin'

export default defineConfig({
  plugins: [TypedPgVitestPlugin()],
})
```

## Creating a client from `DATABASE_URL`

```ts
import postgres from 'postgres'
import { createClient } from 'typed-pg'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('DATABASE_URL is required')

const client = createClient(postgres(databaseUrl))
```

`TypedPgVitestPlugin()` automatically:

- creates a temporary test database
- provisions one temporary database per Vitest worker when file parallelism is enabled
- runs migrations from `./migrations`
- injects the URL into `process.env.DATABASE_URL`
- truncates tables before each test while keeping `typed_pg_migrations`
