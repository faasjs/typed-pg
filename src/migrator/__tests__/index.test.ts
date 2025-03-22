import { describe, it, expect, beforeEach } from "vitest"
import { Migrator } from ".."
import { Client, createClient } from "../../client"
import { createTestingPostgres } from "../../__tests__/utils"

describe('Migrator', () => {
  let client: Client

  beforeEach(async () => {
    client = createClient(createTestingPostgres())

    await client.raw`DROP TABLE IF EXISTS typed_pg_migrations`
    await client.raw`DROP TABLE IF EXISTS migrations`
  })

  it('should create migration table', async () => {
    const migrator = new Migrator({ client, folder: __dirname + '/migrations' })

    expect(await migrator.status()).toEqual([])
  })

  it('should run migration', async () => {
    const migrator = new Migrator({ client, folder: __dirname + '/migrations' })

    await migrator.migrate()

    expect(await migrator.status()).toEqual([{
      name: '20250101000000_create_migrations',
      migration_time: expect.any(Date)
    }])

    expect(await client.raw`SELECT * FROM migrations`).toEqual([])

    await migrator.down()

    expect(await migrator.status()).toEqual([])
  })
})
