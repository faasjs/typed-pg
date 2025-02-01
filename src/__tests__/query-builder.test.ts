import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { type Client, createClient } from '../client'
import { QueryBuilder } from '../query-builder'
import { createTestingPostgres } from './utils'

describe('QueryBuilder', () => {
  let client: Client

  beforeAll(async () => {
    client = createClient(createTestingPostgres())

    await client.raw`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        metadata JSONB
      );
    `

    await client.raw`
      INSERT INTO users (id, name, metadata) VALUES (1, 'Alice', '{"age":100}'), (2, 'Bob', '{}');
    `
  })

  afterAll(async () => {
    await client.raw`DROP TABLE users`

    await client.quit()
  })

  describe('select', () => {
    it('selects all columns', async () => {
      const result = await new QueryBuilder(client, 'users').select().all()

      expect(result).toEqual([
        {
          id: 1,
          name: 'Alice',
          metadata: {
            age: 100,
          },
        },
        { id: 2, name: 'Bob', metadata: {} },
      ])
    })

    it('selects specific columns', async () => {
      const result = await new QueryBuilder(client, 'users')
        .select('name')
        .all()

      expect(result).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
    })
  })

  describe('where', () => {
    it('column and value', async () => {
      const result = await new QueryBuilder(client, 'users')
        .where('name', 'Alice')
        .pluck('id')

      expect(result).toEqual([1])
    })

    it('column, operator, and value', async () => {
      const result = await new QueryBuilder(client, 'users')
        .where('name', '!=', 'Alice')
        .pluck('id')

      expect(result).toEqual([2])
    })

    describe('operator', () => {
      it('IS NULL', async () => {
        const result = await new QueryBuilder(client, 'users')
          .where('name', 'IS NULL')
          .pluck('id')

        expect(result).toEqual([])
      })

      it('IS NOT NULL', async () => {
        const result = await new QueryBuilder(client, 'users')
          .where('name', 'IS NOT NULL')
          .pluck('id')

        expect(result).toEqual([1, 2])
      })

      it('IN', async () => {
        const result = await new QueryBuilder(client, 'users')
          .where('name', 'IN', ['Alice'])
          .pluck('id')

        expect(result).toEqual([1])
      })

      it('NOT IN', async () => {
        const result = await new QueryBuilder(client, 'users')
          .where('name', 'NOT IN', ['Alice'])
          .pluck('id')

        expect(result).toEqual([2])
      })

      it('>', async () => {
        const result = await new QueryBuilder(client, 'users')
          .where('id', '>', 1)
          .pluck('id')

        expect(result).toEqual([2])
      })

      it('>=', async () => {
        const result = await new QueryBuilder(client, 'users')
          .where('id', '>=', 1)
          .pluck('id')

        expect(result).toEqual([1, 2])
      })

      it('<', async () => {
        const result = await new QueryBuilder(client, 'users')
          .where('id', '<', 2)
          .pluck('id')

        expect(result).toEqual([1])
      })

      it('<=', async () => {
        const result = await new QueryBuilder(client, 'users')
          .where('id', '<=', 2)
          .pluck('id')

        expect(result).toEqual([1, 2])
      })

      it('!=', async () => {
        const result = await new QueryBuilder(client, 'users')
          .where('name', '!=', 'Alice')
          .pluck('id')

        expect(result).toEqual([2])
      })

      it('@>', async () => {
        const result = await new QueryBuilder(client, 'users')
          .where('metadata', '@>', { age: 100 })
          .pluck('id')

        expect(result).toEqual([1])
      })

      it('throws error for invalid operator', async () => {
        await expect(() =>
          new QueryBuilder(client, 'users')
            .where('name', 'invalid' as any, 'Alice')
            .pluck('id')
        ).toThrowError('Invalid operator: invalid')
      })
    })

    it('multiple conditions', async () => {
      const result = await new QueryBuilder(client, 'users')
        .where('name', 'Alice')
        .where('id', '>', 1)
        .pluck('id')

      expect(result).toEqual([])
    })
  })

  describe('limit', () => {
    it('limits the number of results', async () => {
      const result = await new QueryBuilder(client, 'users')
        .limit(1)
        .pluck('id')

      expect(result).toEqual([1])
    })
  })

  describe('offset', () => {
    it('offsets the results', async () => {
      const result = await new QueryBuilder(client, 'users')
        .offset(1)
        .pluck('id')

      expect(result).toEqual([2])
    })
  })

  describe('pluck', () => {
    it('returns a single column', async () => {
      const result = await new QueryBuilder(client, 'users').pluck('name')

      expect(result).toEqual(['Alice', 'Bob'])
    })
  })

  describe('count', () => {
    it('counts the number of rows', async () => {
      const result = await new QueryBuilder(client, 'users').count()

      expect(result).toEqual(2)
    })
  })

  describe('first', () => {
    it('returns the first row', async () => {
      const result = await new QueryBuilder(client, 'users').first()

      expect(result).toEqual({ id: 1, name: 'Alice', metadata: { age: 100 } })
    })
  })
})
