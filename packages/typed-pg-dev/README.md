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
import { TypedPgVitestPlugin } from 'typed-pg-dev'

export default defineConfig({
  plugins: [TypedPgVitestPlugin()],
})
```

The plugin automatically skips browser-like Vitest environments such as `jsdom` and `happy-dom`.
To target a narrower set explicitly, pass `projects` and/or `environments`:

```ts
import { defineConfig } from 'vitest/config'
import { TypedPgVitestPlugin } from 'typed-pg-dev'

export default defineConfig({
  plugins: [
    TypedPgVitestPlugin({
      projects: ['api'],
      environments: ['node'],
      beforeReset: '@/db/client#closeDbClient',
    }),
  ],
})
```

`beforeReset` is useful when your app caches a long-lived database client and you want the plugin
to close that cache before truncating tables for the next test.

## Creating a client from `DATABASE_URL`

```ts
import { createClient } from 'typed-pg'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('DATABASE_URL is required')

const client = createClient(databaseUrl, { max: 1, ssl: false })
```

`TypedPgVitestPlugin()` automatically:

- creates a temporary test database
- provisions one temporary database per Vitest worker when file parallelism is enabled
- runs migrations from `./migrations`
- injects the URL into `process.env.DATABASE_URL`
- truncates tables before each test while keeping `typed_pg_migrations`
