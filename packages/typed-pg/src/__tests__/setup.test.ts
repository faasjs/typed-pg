import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('typed-pg test setup', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const originalPoolId = process.env.VITEST_POOL_ID

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    delete process.env.DATABASE_URL
    delete process.env.VITEST_POOL_ID
  })

  afterEach(() => {
    if (typeof originalDatabaseUrl === 'string') process.env.DATABASE_URL = originalDatabaseUrl
    else delete process.env.DATABASE_URL

    if (typeof originalPoolId === 'string') process.env.VITEST_POOL_ID = originalPoolId
    else delete process.env.VITEST_POOL_ID
  })

  it('sets DATABASE_URL from the current worker database mapping', async () => {
    const inject = vi.fn(() => ({
      '1': 'postgresql://worker-1',
      '2': 'postgresql://worker-2',
    }))

    process.env.VITEST_POOL_ID = '2'

    vi.doMock('vitest', () => ({
      inject,
    }))

    await import('./setup')

    expect(inject).toHaveBeenCalledWith('__typedPgVitestDatabaseUrls')
    expect(process.env.DATABASE_URL).toBe('postgresql://worker-2')
  })
})
