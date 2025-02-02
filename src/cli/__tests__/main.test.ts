import { describe, expect, it } from 'vitest'
import { main } from '../main'

describe('cli', () => {
  it('DATABASE_URL is required', async () => {
    delete process.env.DATABASE_URL

    await expect(async () => main()).rejects.toThrow('DATABASE_URL not set, please run `DATABASE_URL=postgres://<your pg url> typed-pg`')
  })
})
