[typed-pg](../README.md) / createClient

# Function: createClient()

> **createClient**(`sql`): [`Client`](../classes/Client.md)

Creates a new instance of the `Client` class using the provided SQL configuration.

## Parameters

### sql

`Sql`

The SQL configuration object used to initialize the client.

## Returns

[`Client`](../classes/Client.md)

A new `Client` instance.

## Example

```ts
import { createClient } from 'typed-pg'
import postgres from 'postgres'

const sql = postgres('postgres://user:pass@localhost:5432/db')

const client = createClient(sql)
```
