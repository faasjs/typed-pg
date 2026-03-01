# typed-pg

[![License: MIT](https://img.shields.io/npm/l/typed-pg.svg)](https://github.com/faasjs/typed-pg/blob/main/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/typed-pg.svg)](https://www.npmjs.com/package/typed-pg)
[![Last commit](https://img.shields.io/github/last-commit/faasjs/typed-pg)](https://github.com/faasjs/typed-pg)
[![Unit Status](https://github.com/faasjs/typed-pg/actions/workflows/unit-test.yml/badge.svg)](https://github.com/faasjs/typed-pg/actions/workflows/unit-test.yml)

[![Coverage Status](https://img.shields.io/codecov/c/github/faasjs/typed-pg.svg)](https://app.codecov.io/gh/faasjs/typed-pg)
[![Commits](https://img.shields.io/github/commit-activity/y/faasjs/typed-pg)](https://github.com/faasjs/typed-pg/commits)
[![Downloads](https://img.shields.io/npm/dm/typed-pg)](https://github.com/faasjs/typed-pg)
[![Pull requests](https://img.shields.io/github/issues-pr-closed/faasjs/typed-pg)](https://github.com/faasjs/typed-pg/pulls)

**This package is still in development and not yet ready for production use.**

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

## Testing

Tests run against a PGlite socket server started by Vitest global setup, so no external PostgreSQL service is required.
