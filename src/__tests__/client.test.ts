import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { Client, createClient } from '../client'
import { createTestingPostgres } from './utils'
import { QueryBuilder } from '../query-builder'
import { isAsyncFunction } from 'node:util/types'

describe('client', () => {
  let client: Client

  beforeAll(() => {
    client = createClient(createTestingPostgres())
  })

  afterAll(async () => {
    await client.quit()
  })

  describe('raw', () => {
    it('string', async () => {
      expect(await client.raw('SELECT 1+1')).toEqual([{ '?column?': 2 }])
    })

    it('template', async () => {
      expect(await client.raw`SELECT 1+1`).toEqual([{ '?column?': 2 }])
    })

    it('string with params', async () => {
      expect(await client.raw('SELECT 1+?', [1])).toEqual([{ '?column?': 2 }])
    })

    it('template with params', async () => {
      expect(await client.raw`SELECT 1+${1}`).toEqual([{ '?column?': 2 }])
    })

    it('string with type cast', async () => {
      expect(
        await client.raw('SELECT ?::integer + ?::integer', 1, 1)
      ).toEqual([{ '?column?': 2 }])
    })

    it('template with type cast', async () => {
      expect(await client.raw`SELECT ${1}::integer+${1}::integer`).toEqual([
        { '?column?': 2 },
      ])
    })
  })

  describe('logger', () => {
    it('skips debug logging when logger is disabled', async () => {
      const postgres = vi.fn(async () => [{ ok: true }]) as any
      const localClient = new Client(postgres, { logger: false })

      expect(await localClient.raw('SELECT 1')).toEqual([{ ok: true }])
      expect(localClient.logger).toBeUndefined()
      expect(postgres).toHaveBeenCalledTimes(1)
    })

    it('records timing in debug mode', async () => {
      const postgres = vi.fn(async () => [{ ok: true }]) as any
      const localClient = new Client(postgres, {
        logger: {
          label: 'typed-pg-test',
          level: 'debug',
        },
      })

      const timeSpy = vi.spyOn(localClient.logger!, 'time')
      const timeEndSpy = vi.spyOn(localClient.logger!, 'timeEnd')

      expect(await localClient.raw('SELECT ?::integer', 1)).toEqual([{ ok: true }])
      expect(timeSpy).toHaveBeenCalledTimes(1)
      expect(timeEndSpy).toHaveBeenCalledTimes(1)
    })

    it('logs and rethrows query errors in debug mode', async () => {
      const postgres = vi.fn(async () => {
        throw new Error('raw failed')
      }) as any
      const localClient = new Client(postgres, {
        logger: {
          label: 'typed-pg-test',
          level: 'debug',
        },
      })

      const timeEndSpy = vi.spyOn(localClient.logger!, 'timeEnd')
      const errorSpy = vi.spyOn(localClient.logger!, 'error')

      await expect(localClient.raw('SELECT 1')).rejects.toThrowError('raw failed')
      expect(timeEndSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('query', () => {
    expect(client.query('query')).toBeInstanceOf(QueryBuilder)
  })

  it('quit', async () => {
    expect(isAsyncFunction(client.quit)).toBeTruthy()
  })

  it('transaction', async () => {
    expect(await client.transaction(async (client) => client.raw`SELECT 1`)).toEqual([
      { '?column?': 1 },
    ])
  })
})
