# typed-pg

This repository is managed as a `vite-plus` workspace.
The published packages now live in `packages/typed-pg` and `packages/typed-pg-dev`.

[![License: MIT](https://img.shields.io/npm/l/typed-pg.svg)](https://github.com/faasjs/typed-pg/blob/main/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/typed-pg.svg)](https://www.npmjs.com/package/typed-pg)
[![Last commit](https://img.shields.io/github/last-commit/faasjs/typed-pg)](https://github.com/faasjs/typed-pg)
[![Unit Status](https://github.com/faasjs/typed-pg/actions/workflows/unit-test.yml/badge.svg)](https://github.com/faasjs/typed-pg/actions/workflows/unit-test.yml)

[![Coverage Status](https://img.shields.io/codecov/c/github/faasjs/typed-pg.svg)](https://app.codecov.io/gh/faasjs/typed-pg)
[![Commits](https://img.shields.io/github/commit-activity/y/faasjs/typed-pg)](https://github.com/faasjs/typed-pg/commits)
[![Downloads](https://img.shields.io/npm/dm/typed-pg)](https://github.com/faasjs/typed-pg)
[![Pull requests](https://img.shields.io/github/issues-pr-closed/faasjs/typed-pg)](https://github.com/faasjs/typed-pg/pulls)

`typed-pg` is ready for production use on the supported runtime targets: `node >= 24` and `npm >= 11`.

A type-safe PostgreSQL query builder for TypeScript with a fluent API.

## Features

- 🎯 Full TypeScript support
- 🔒 Type-safe queries
- ⚡ Built on top of the high-performance `postgres.js` package
- 🔗 Fluent chainable API
- 🧩 Flexible SQL fragments: `whereRaw`, `orWhereRaw`, `orderByRaw`
- 🔍 Pattern matching operators in `where`: `LIKE`, `ILIKE`, `NOT LIKE`, `NOT ILIKE`
- 🔀 Join helpers: `join` and `leftJoin` with Knex-style arguments
- 🛡️ SQL injection prevention
- 📦 Transaction support
- 🎨 Clean and intuitive API

## Query examples

```ts
await client
  .query('users')
  .join('profiles', 'users.id', 'profiles.user_id')
  .where('users.name', 'ILIKE', 'alice%')
  .whereRaw('"profiles"."deleted_at" IS NULL')
  .orWhereRaw('"users"."is_admin" = ?', true)
  .orderByRaw('CASE WHEN "users"."status" = ? THEN 0 ELSE 1 END', 'active')
```

## Installation

```bash
npm install typed-pg
```

For development and tests, pair it with `typed-pg-dev`:

```bash
npm install -D typed-pg-dev
```

## Testing

Tests run against a temporary database started by `typed-pg-dev`, so no
external PostgreSQL service is required.

```ts
import { defineConfig } from 'vitest/config'
import { TypedPgVitestPlugin } from 'typed-pg-dev'

export default defineConfig({
  plugins: [TypedPgVitestPlugin()],
})
```

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
