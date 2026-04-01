[typed-pg-dev](../../README.md) / [index](../README.md) / createPGliteDatabaseUrl

# Function: createPGliteDatabaseUrl()

> **createPGliteDatabaseUrl**(`serverConn`, `options?`): `string`

Creates a PostgreSQL connection string for the running PGlite socket server.

## Parameters

### serverConn

`string`

Socket server address in `host:port` form.

### options?

[`CreatePGliteDatabaseUrlOptions`](../interfaces/CreatePGliteDatabaseUrlOptions.md) = `{}`

Connection-string overrides.

## Returns

`string`

PostgreSQL connection string for the started PGlite server.
