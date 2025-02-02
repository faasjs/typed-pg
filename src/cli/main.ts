import postgres, { type Sql } from "postgres"
import { Logger } from '@faasjs/logger'

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
    logger.error('Please provide a operation to run: `typed-pg <operation>`, e.g. `typed-pg status`')
    return
  }

  switch (operation) {
    case 'status': {
      await sql`CREATE TABLE IF NOT EXISTS typed_pg_migrations_lock (
        "index" serial4 NOT NULL,is_locked int4 NULL,CONSTRAINT typed_pg_migrations_lock_pkey PRIMARY KEY (index)
      )`
      await sql`CREATE TABLE IF NOT EXISTS typed_pg_migrations (
        id serial4 NOT NULL,
        "name" varchar(255) NULL,
	      batch int4 NULL,
	      migration_time timestamptz NULL,
	      CONSTRAINT typed_pg_migrations_pkey PRIMARY KEY (id)
      )`
      const lock = await sql`SELECT * FROM typed_pg_migrations_lock`
      const migrations = await sql`SELECT * FROM typed_pg_migrations`

      logger.info('Status:')
      logger.info('Lock:', lock)
      logger.info('Migrations:', migrations)
      break
    }
  }
}
