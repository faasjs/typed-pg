[typed-pg](../README.md) / createClient

# Function: createClient()

> **createClient**(`url`, `options?`): [`Client`](../classes/Client.md)

Creates a new instance of the `Client` class from a PostgreSQL connection string.

## Parameters

### url

`string`

The PostgreSQL connection string.

### options?

`postgres.Options<Record<string, never>>`

Optional `postgres.js` options when `url` is provided.

## Returns

[`Client`](../classes/Client.md)

A new `Client` instance.

## Example

```ts
import { createClient } from 'typed-pg'

const client = createClient('postgres://user:pass@localhost:5432/db')
```
