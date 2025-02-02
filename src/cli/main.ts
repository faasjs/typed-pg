import postgres, { type Sql } from "postgres"
import { Logger } from '@faasjs/logger'
import { existsSync, globSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'
import { SchemaBuilder } from "../schema-builder"
import { createClient } from "../client"

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

  switch (operation) {
    case 'status': {
      await createMigrationTable(sql)
      const migrations = await sql`SELECT * FROM typed_pg_migrations`

      logger.info('Status:')
      logger.info('Migrations:', migrations)
      break
    }
    case 'migrate': {
      const folder = resolve('migrations')

      if (!existsSync(folder)) {
        logger.error('Migration folder not found:', folder)
        return
      }

      const files = globSync(join(folder, '*.ts'))

      if (!files.length) {
        logger.error('No migration files found:', folder)
        return
      }

      await createMigrationTable(sql)
      const migrations = await sql`SELECT * FROM typed_pg_migrations`

      const builder = new SchemaBuilder(createClient(sql))

      for (const file of files) {
        const name = basename(file).replace('.ts', '')
        const up = (await import(file)).up

        if (migrations.find((m: any) => m.name === name)) {
          logger.debug('Migration already ran:', name)
          continue
        }

        logger.info('Migrating:', name)

        try {
          up(builder)
          await builder.run()

          await sql`INSERT INTO typed_pg_migrations (name, migration_time) VALUES (${name}, NOW())`
        } catch (error) {
          logger.error('Migrate failed:', name, error)
          return
        }
      }
      break
    }
    case 'up': {
      const folder = resolve('migrations')

      if (!existsSync(folder)) {
        logger.error('Migration folder not found:', folder)
        return
      }

      const files = globSync(join(folder, '*.ts'))

      if (!files.length) {
        logger.error('No migration files found:', folder)
        return
      }

      await createMigrationTable(sql)

      const migrations = await sql`SELECT * FROM typed_pg_migrations ORDER BY migration_time DESC LIMIT 1`

      const lastMigration = migrations[0]

      const nextFile = files.find((file) => basename(file).replace('.ts', '') > lastMigration?.name)

      if (!nextFile) {
        logger.error('No pending migrations found')
        return
      }

      const name = basename(nextFile).replace('.ts', '')

      const builder = new SchemaBuilder(createClient(sql))

      logger.info('Migrating:', name)

      try {
        const { up } = await import(nextFile)
        up(builder)
        await builder.run()

        await sql`INSERT INTO typed_pg_migrations (name, migration_time) VALUES (${name}, NOW())`
      } catch (error) {
        logger.error('Migrate failed:', name, error)
        return
      }

      break
    }
    case 'down': {
      const folder = resolve('migrations')

      if (!existsSync(folder)) {
        logger.error('Migration folder not found:', folder)
        return
      }

      const files = globSync(join(folder, '*.ts'))

      if (!files.length) {
        logger.error('No migration files found:', folder)
        return
      }

      await createMigrationTable(sql)
      const migrations = await sql`SELECT * FROM typed_pg_migrations ORDER BY migration_time DESC LIMIT 1`

      const lastMigration = migrations[0]

      if (!lastMigration) {
        logger.error('No migrations found')
        return
      }

      const file = join(folder, `${lastMigration.name}.ts`)

      if (!existsSync(file)) {
        logger.error('Migration file not found:', file)
        return
      }

      const builder = new SchemaBuilder(createClient(sql))

      logger.info('Rolling back:', lastMigration.name)

      try {
        const { down } = await import(file)
        down(builder)
        await builder.run()

        await sql`DELETE FROM typed_pg_migrations WHERE name = ${lastMigration.name} LIMIT 1`
      } catch (error) {
        logger.error('Rollback failed:', lastMigration.name, error)
        return
      }

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
      writeFileSync(file, `
// ${filename}.ts
import type { SchemaBuilder } from '@typed-pg/schema-builder'

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
