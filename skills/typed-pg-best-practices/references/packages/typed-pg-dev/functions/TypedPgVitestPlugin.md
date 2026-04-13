[typed-pg-dev](../README.md) / TypedPgVitestPlugin

# Function: TypedPgVitestPlugin()

> **TypedPgVitestPlugin**(): `Plugin`

Creates the Vitest plugin that wires `typed-pg-dev` into the test runner.

The plugin starts worker-isolated temporary databases, runs migrations from `./migrations`,
injects the connection string into `process.env.DATABASE_URL`, and clears table contents before
each test.

## Returns

`Plugin`

Vitest/Vite plugin instance.
