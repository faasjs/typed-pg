import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('typed-pg-vitest setup', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const originalPoolId = process.env.VITEST_POOL_ID
  let registeredBeforeEach: (() => Promise<void>) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    registeredBeforeEach = undefined
    delete process.env.DATABASE_URL
    delete process.env.VITEST_POOL_ID
  })

  afterEach(() => {
    if (typeof originalDatabaseUrl === 'string') process.env.DATABASE_URL = originalDatabaseUrl
    else delete process.env.DATABASE_URL

    if (typeof originalPoolId === 'string') process.env.VITEST_POOL_ID = originalPoolId
    else delete process.env.VITEST_POOL_ID
  })

  async function loadSetupModule(options: {
    databaseUrls?: Record<string, string>
    resetImplementation?: () => Promise<void>
  }) {
    const end = vi.fn(async () => undefined)
    const sql = { end }
    const inject = vi.fn(() => options.databaseUrls)
    const beforeEach = vi.fn((callback: () => Promise<void>) => {
      registeredBeforeEach = callback
    })
    const createTestingPostgres = vi.fn(() => sql)
    const resetTestingDatabase = vi.fn(options.resetImplementation ?? (async () => undefined))

    vi.doMock('vitest', () => ({
      beforeEach,
      inject,
    }))
    vi.doMock('../postgres', () => ({
      createTestingPostgres,
    }))
    vi.doMock('../testing', () => ({
      resetTestingDatabase,
    }))

    const module = await import('../typed-pg-vitest-setup')

    return {
      module,
      mocks: {
        beforeEach,
        createTestingPostgres,
        end,
        inject,
        resetTestingDatabase,
      },
      sql,
    }
  }

  it('sets DATABASE_URL from the current worker and registers a reset hook', async () => {
    process.env.VITEST_POOL_ID = '2'

    const { mocks, sql } = await loadSetupModule({
      databaseUrls: {
        '1': 'postgresql://worker-1',
        '2': 'postgresql://worker-2',
      },
    })

    expect(process.env.DATABASE_URL).toBe('postgresql://worker-2')
    expect(mocks.inject).toHaveBeenCalledWith('__typedPgVitestDatabaseUrls')
    expect(mocks.beforeEach).toHaveBeenCalledTimes(1)
    expect(registeredBeforeEach).toBeTypeOf('function')

    await registeredBeforeEach?.()

    expect(mocks.createTestingPostgres).toHaveBeenCalledWith('postgresql://worker-2')
    expect(mocks.resetTestingDatabase).toHaveBeenCalledWith(sql, ['typed_pg_migrations'])
    expect(mocks.end).toHaveBeenCalledTimes(1)
  })

  it('still closes the sql client when the reset hook fails', async () => {
    const error = Error('reset failed')

    const { mocks } = await loadSetupModule({
      databaseUrls: {
        '1': 'postgresql://worker-1',
      },
      resetImplementation: async () => Promise.reject(error),
    })

    await expect(registeredBeforeEach?.()).rejects.toThrowError('reset failed')

    expect(mocks.end).toHaveBeenCalledTimes(1)
  })

  it('throws when the plugin did not provide any database urls', async () => {
    await expect(loadSetupModule({})).rejects.toThrowError(
      /did not provide a testing database URL/,
    )
    expect(registeredBeforeEach).toBeUndefined()
  })
})
