import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { type Client, createClient } from '../../client'
import { createTestingPostgres } from '../../__tests__/utils'
import { SchemaBuilder } from '..'

describe('SchemaBuilder', () => {
  let client: Client

  beforeAll(async () => {
    client = createClient(createTestingPostgres())

    await client.raw('DROP TABLE IF EXISTS creators')
    await client.raw('DROP TABLE IF EXISTS alters')
  })

  afterAll(async () => {
    await client.quit()
  })

  it('createTable', async () => {
    const builder = new SchemaBuilder(client)

    builder.createTable('creators', table => {
      table.string('string').primary().unique()
      table.number('number')
      table.boolean('boolean')
      table.date('date')
      table.json('json')
      table.jsonb('jsonb')
      table.timestamp('timestamp')
      table.timestamptz('timestamptz')
      table.timestamps()
      table.specificType('uuid_list', 'uuid[]')

      table.index('string')
    })

    await builder.run()

    const tables = await client.raw(
      'SELECT * FROM information_schema.tables WHERE table_name = ?',
      'creators'
    )
    expect(tables[0]).toMatchObject({ table_name: 'creators' })

    const columns = await client.raw(
      'SELECT * FROM information_schema.columns WHERE table_name = ?',
      'creators'
    )

    for (const column of [
      { column_name: 'string', data_type: 'character varying' },
      { column_name: 'number', data_type: 'integer' },
      { column_name: 'boolean', data_type: 'boolean' },
      { column_name: 'date', data_type: 'date' },
      { column_name: 'json', data_type: 'json' },
      { column_name: 'jsonb', data_type: 'jsonb' },
      { column_name: 'timestamp', data_type: 'timestamp without time zone' },
      { column_name: 'timestamptz', data_type: 'timestamp with time zone' },
      {
        column_name: 'created_at',
        data_type: 'timestamp with time zone',
        column_default: 'now()',
      },
      {
        column_name: 'updated_at',
        data_type: 'timestamp with time zone',
        column_default: 'now()',
      },
      { column_name: 'uuid_list', data_type: 'ARRAY', udt_name: '_uuid' },
    ]) {
      expect(
        columns.find(c => c.column_name === column.column_name)
      ).toMatchObject(column)
    }

    const indices = await client.raw(
      'SELECT * FROM pg_indexes WHERE tablename = ?',
      'creators'
    )

    expect(
      indices.find(i => i.indexname.includes('creators_pkey'))
    ).toMatchObject({
      schemaname: 'public',
      tablename: 'creators',
      indexname: 'creators_pkey',
      tablespace: null,
      indexdef: 'CREATE UNIQUE INDEX creators_pkey ON public.creators USING btree (string)',
    })

    expect(
      indices.find(i => i.indexname.includes('idx_creators_string'))
    ).toMatchObject({
      schemaname: 'public',
      tablename: 'creators',
      indexname: 'idx_creators_string',
      tablespace: null,
      indexdef:
        'CREATE INDEX idx_creators_string ON public.creators USING btree (string)',
    })
  })

  it('alterTable', async () => {
    const builder = new SchemaBuilder(client)

    builder.createTable('alters', table => {
      table.string('string').primary()
      table.timestamps()
    })

    await builder.run()

    builder.alterTable('alters', table => {
      table.renameColumn('string', 'new_string')
      table.number('number')
      table.dropColumn('created_at')
      table.alterColumn('string', {
        primary: false,
      })
      table.alterColumn('updated_at', {
        type: 'date',
        defaultValue: null,
        primary: true,
        unique: true,
        check: 'updated_at > now()',
      })
      table.index('number', {
        unique: true,
        indexType: 'btree',
      })
      table.raw('SELECT 1')
    })

    await builder.run()

    const columns = await client.raw(
      'SELECT * FROM information_schema.columns WHERE table_name = ?',
      'alters'
    )

    for (const column of [
      { column_name: 'new_string', data_type: 'character varying' },
      { column_name: 'number', data_type: 'integer' },
      { column_name: 'updated_at', data_type: 'date', column_default: null },
    ]) {
      expect(
        columns.find(c => c.column_name === column.column_name)
      ).toMatchObject(column)
    }

    const indices = await client.raw(
      'SELECT * FROM pg_indexes WHERE tablename = ?',
      'alters'
    )

    expect(
      indices.find(i => i.indexname.includes('alters_pkey'))
    ).toMatchObject({
      schemaname: 'public',
      tablename: 'alters',
      indexname: 'alters_pkey',
      tablespace: null,
      indexdef: 'CREATE UNIQUE INDEX alters_pkey ON public.alters USING btree (updated_at)',
    })

    expect(
      indices.find(i => i.indexname.includes('idx_alters_number'))
    ).toMatchObject({
      schemaname: 'public',
      tablename: 'alters',
      indexname: 'idx_alters_number',
      tablespace: null,
      indexdef:
        'CREATE UNIQUE INDEX idx_alters_number ON public.alters USING btree (number)',
    })
  })
})
