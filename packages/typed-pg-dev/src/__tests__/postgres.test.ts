import { afterEach, describe, expect, it } from 'vitest'

import {
  createTestingPostgres,
  DEFAULT_DATABASE_URL_ENV,
  DEFAULT_TESTING_DATABASE_URL,
  getTestingDatabaseUrl,
} from '../postgres'

describe('postgres helpers', () => {
  const previousDatabaseUrl = process.env[DEFAULT_DATABASE_URL_ENV]

  afterEach(() => {
    if (typeof previousDatabaseUrl === 'string')
      process.env[DEFAULT_DATABASE_URL_ENV] = previousDatabaseUrl
    else delete process.env[DEFAULT_DATABASE_URL_ENV]
  })

  it('prefers DATABASE_URL from the environment', () => {
    process.env[DEFAULT_DATABASE_URL_ENV] = 'postgresql://example.test:5432/app'

    expect(getTestingDatabaseUrl()).toBe('postgresql://example.test:5432/app')
  })

  it('falls back to the default testing database url', () => {
    delete process.env[DEFAULT_DATABASE_URL_ENV]

    expect(getTestingDatabaseUrl()).toBe(DEFAULT_TESTING_DATABASE_URL)
  })

  it('creates a postgres.js client with testing-friendly defaults', async () => {
    const sql = createTestingPostgres()

    try {
      const [row] = await sql<{ value: number }[]>`select 1 as value`

      expect(row?.value).toBe(1)
    } finally {
      await sql.end()
    }
  })
})
