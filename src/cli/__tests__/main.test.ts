import { beforeEach, describe, expect, it, vi } from 'vitest'
import { main } from '../main'
import { DATABASE_URL } from '../../__tests__/utils'

describe('cli', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      process.stderr.write(`${args.join(' ')}\n`)
    })
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      process.stdout.write(`${args.join(' ')}\n`)
    })
  })

  it('should throw error on failed database connection', async () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:1/template1?connect_timeout=1'

    await main()

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error connecting to database, please check your DATABASE_URL'
      )
    )

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'ECONNREFUSED'
      )
    )
  })

  it('should log success on successful connection', async () => {
    process.env.DATABASE_URL = DATABASE_URL

    await main()

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(
        'Connected to database successfully'
      )
    )
  })
})
