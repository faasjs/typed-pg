import postgres, { type Sql } from "postgres"
import { Logger } from '@faasjs/logger'
import { existsSync, globSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'
import { SchemaBuilder } from "../schema-builder"
import { createClient } from "../client"
import { Migrator } from "../migrator"

function createMigrationTable(sql: Sql) {
  return sql`CREATE TABLE IF NOT EXISTS typed_pg_migrations (
    "name" varchar(255) NULL,
    migration_time timestamptz NULL,
    CONSTRAINT typed_pg_migrations_pkey PRIMARY KEY (name)
  )`
}

export async function main(operation = process.argv[2] as string) {
  const logger = new Logger('TypedPg')
  const connection = process.env.DATABASE_URL as string

  if (!connection) {
    logger.error('DATABASE_URL not set, please run `DATABASE_URL=postgres://<your pg url> typed-pg`')
    return
  }

  let sql: Sql

  try {
    sql = postgres(connection)
    await sql`SELECT 1`
    logger.info('Connected to database successfully')
  } catch (error) {
    logger.error('Error connecting to database, please check your DATABASE_URL\n', error)
    return
  }

  if (!operation) {
    logger.error(`Please provide a operation to run: typed-pg <operation>
- status: Show the status of migrations
- migrate: Run all pending migrations
- up: Run the next migration
- down: Rollback the last migration
- new <name>: Create a new migration file with the given name
`)
    return
  }

  const migrator = new Migrator({ client: createClient(sql), folder: 'migrations' })

  switch (operation) {
    case 'status': {
      const migrations = await migrator.status()

      logger.info('Status:')
      migrations.forEach(migration => {
        logger.info(`- ${migration.name} (${migration.migration_time})`)
      })
      break
    }
    case 'migrate': {
      await migrator.migrate()
      break
    }
    case 'up': {
      await migrator.up()
      break
    }
    case 'down': {
      await migrator.down()
      break
    }
    case 'new': {
      const name = process.argv[3] as string

      if (!name) {
        logger.error('Please provide a name for the migration: `typed-pg new <name>`')
        return
      }

      const folder = resolve('migrations')
      const filename = `${new Date().toISOString().replace(/[^0-9]/g, '')}-${name}.ts`
      const file = join(folder, filename)

      if (!existsSync(folder))
        mkdirSync(folder, { recursive: true })
      writeFileSync(file, `// ${filename}.ts
import type { SchemaBuilder } from 'typed-pg'

export function up(builder: SchemaBuilder) {
  // Write your migration here
}

export function down(builder: SchemaBuilder) {
  // Write your rollback here
}
`)

      logger.info('Created migration:', file)
      break
    }
    default:
      logger.error('Unknown operation:', operation)
      break
  }
}
