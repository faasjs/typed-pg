[typed-pg-dev](../../README.md) / [index](../README.md) / createVitestSetup

# Function: createVitestSetup()

> **createVitestSetup**(`options?`): () => `Promise`\<() => `Promise`\<`void`\>\>

Creates a Vitest `globalSetup` function backed by a temporary PGlite server.

The setup stores the generated connection string in `DATABASE_URL` by default and restores the
previous environment value during teardown.

## Parameters

### options?

[`CreateVitestSetupOptions`](../interfaces/CreateVitestSetupOptions.md) = `{}`

Optional server and environment configuration.

## Returns

Vitest-compatible async global setup function.

() => `Promise`\<() => `Promise`\<`void`\>\>
