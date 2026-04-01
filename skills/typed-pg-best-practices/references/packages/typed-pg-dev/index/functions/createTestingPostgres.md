[typed-pg-dev](../../README.md) / [index](../README.md) / createTestingPostgres

# Function: createTestingPostgres()

> **createTestingPostgres**\<`T`\>(`options?`): `Sql`\<`Record`\<`string`, `PostgresType`\<`any`\>\> _extends_ `T` ? `object` : \{ \[type in string \| number \| symbol\]: T\[type\] extends \{\} ? R : never \}\>

Creates a `postgres.js` client configured for `typed-pg` tests.

Defaults to a single connection and disabled SSL so the client works with the bundled PGlite
socket server setup.

## Type Parameters

### T

`T` _extends_ `Record`\<`string`, `PostgresType`\<`any`\>\> = `Record`\<`string`, `never`\>

## Parameters

### options?

[`CreateTestingPostgresOptions`](../type-aliases/CreateTestingPostgresOptions.md)\<`T`\> = `...`

Optional testing database and driver
overrides.

## Returns

`Sql`\<`Record`\<`string`, `PostgresType`\<`any`\>\> _extends_ `T` ? `object` : \{ \[type in string \| number \| symbol\]: T\[type\] extends \{\} ? R : never \}\>

Configured `postgres.js` client instance.
