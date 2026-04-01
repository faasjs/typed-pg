import postgres from 'postgres'
import { describe, expect, it } from 'vitest'

import { createPGliteDatabaseUrl, createVitestSetup, startPGliteServer } from '../pglite'
import { createTestingPostgres } from '../postgres'

describe('pglite helpers', () => {
  it('builds a postgres connection string from a socket server address', () => {
    const url = new URL(
      createPGliteDatabaseUrl('127.0.0.1:5432', {
        database: 'typed_pg_dev',
        password: 'secret',
        searchParams: {
          connect_timeout: 10,
        },
        username: 'tester',
      }),
    )

    expect(url.username).toBe('tester')
    expect(url.password).toBe('secret')
    expect(url.hostname).toBe('127.0.0.1')
    expect(url.port).toBe('5432')
    expect(url.pathname).toBe('/typed_pg_dev')
    expect(url.searchParams.get('sslmode')).toBe('disable')
    expect(url.searchParams.get('connect_timeout')).toBe('10')
  })

  it('starts a pglite socket server with a working postgres url', async () => {
    const testingServer = await startPGliteServer()
    const sql = postgres(testingServer.databaseUrl, { max: 1, ssl: false })

    try {
      const [row] = await sql<{ value: number }[]>`select 1 as value`

      expect(row?.value).toBe(1)
    } finally {
      await sql.end()
      await testingServer.stop()
    }
  })

  it('sets and restores a custom database env var for test runners', async () => {
    const envName = 'TYPED_PG_DEV_DATABASE_URL'
    const originalValue = process.env[envName]

    process.env[envName] = 'postgresql://previous.test:5432/app'

    const setup = createVitestSetup({ envName })
    const cleanup = await setup()

    try {
      expect(process.env[envName]).not.toBe('postgresql://previous.test:5432/app')

      const sql = createTestingPostgres({ envName })
      const [row] = await sql<{ value: number }[]>`select 1 as value`

      expect(row?.value).toBe(1)
      await sql.end()
    } finally {
      await cleanup()

      if (typeof originalValue === 'string') process.env[envName] = originalValue
      else delete process.env[envName]
    }

    expect(process.env[envName]).toBe(originalValue)
  })
})
