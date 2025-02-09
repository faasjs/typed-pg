import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { type Client, createClient } from '../../client'
import { QueryBuilder } from '../../query-builder'
import { createTestingPostgres } from '../utils'

describe('QueryBuilder/mutation', () => {
  let client: Client

  beforeAll(async () => {
    client = createClient(createTestingPostgres())

    await client.raw`
      CREATE TABLE mutation (
        id SERIAL PRIMARY KEY,
        name TEXT,
        metadata JSONB
      );
    `
  })

  afterAll(async () => {
    await client.raw`DROP TABLE mutation`

    await client.quit()
  })

  beforeEach(async () => {
    await client.raw`TRUNCATE mutation`

    await client.raw`
      INSERT INTO mutation (id, name, metadata) VALUES (1, 'Alice', '{"age":100}'), (2, 'Bob', '{}');
    `
  })

  describe('insert', () => {
    it('inserts a row', async () => {
      const returning = await new QueryBuilder(client, 'mutation').insert(
        {
          id: 3,
          name: 'Charlie',
          metadata: { age: 50 },
        },
        { returning: ['name', 'metadata'] }
      )

      expect(returning).toEqual([{ name: 'Charlie', metadata: { age: 50 } }])

      const result = await new QueryBuilder(client, 'mutation').pluck('name')

      expect(result).toEqual(['Alice', 'Bob', 'Charlie'])
    })

    it('inserts multiple rows', async () => {
      const returning = await new QueryBuilder(client, 'mutation').insert(
        [
          { id: 3, name: 'Charlie', metadata: { age: 50 } },
          { id: 4, name: 'David', metadata: { age: 25 } },
        ],
        { returning: ['name', 'metadata'] }
      )

      expect(returning).toEqual([
        { name: 'Charlie', metadata: { age: 50 } },
        { name: 'David', metadata: { age: 25 } },
      ])

      const result = await new QueryBuilder(client, 'mutation').pluck('name')

      expect(result).toEqual(['Alice', 'Bob', 'Charlie', 'David'])
    })
  })

  describe('update', () => {
    it('updates a row', async () => {
      const returning = await new QueryBuilder(client, 'mutation')
        .where('name', 'Alice')
        .update({ name: 'David' }, { returning: ['name'] })

      expect(returning).toEqual([{ name: 'David' }])

      const result = await new QueryBuilder(client, 'mutation').pluck('name')

      expect(result).toEqual(['Bob', 'David'])
    })
  })

  describe('delete', () => {
    it('deletes a row', async () => {
      await new QueryBuilder(client, 'mutation').where('name', 'Alice').delete()

      const result = await new QueryBuilder(client, 'mutation').pluck('name')

      expect(result).toEqual(['Bob'])
    })
  })
})
