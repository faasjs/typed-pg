[typed-pg-dev](../../README.md) / [index](../README.md) / startPGliteServer

# Function: startPGliteServer()

> **startPGliteServer**(`options?`): `Promise`\<[`StartedPGliteServer`](../interfaces/StartedPGliteServer.md)\>

Starts a temporary PGlite socket server and returns its lifecycle handle.

## Parameters

### options?

[`StartPGliteServerOptions`](../interfaces/StartPGliteServerOptions.md) = `{}`

Optional server and connection configuration.

## Returns

`Promise`\<[`StartedPGliteServer`](../interfaces/StartedPGliteServer.md)\>

Started server handle with a `stop()` method.
