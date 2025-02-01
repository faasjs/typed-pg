import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import postgres from 'postgres'
import { type Client, createClient } from '../client'

describe('client', () => {
  let client: Client

  beforeAll(() => {
    client = createClient(postgres(process.env.PG_CONNECTION || 'postgresql://development@pg/development'))
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
      expect(await client.raw('SELECT ?::integer + ?::integer', [1, 1])).toEqual([
        { '?column?': 2 },
      ])
    })

    it('template with type cast', async () => {
      expect(await client.raw`SELECT ${1}::integer+${1}::integer`).toEqual([
        { '?column?': 2 },
      ])
    })
  })
})
