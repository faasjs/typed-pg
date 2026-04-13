import { globSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { SchemaBuilder, createClient } from 'typed-pg'
import type { TestProject } from 'vitest/node'

import { startPGliteServer, type StartedPGliteServer } from './pglite'
import {
  TYPED_PG_VITEST_DATABASE_URLS_KEY,
  TYPED_PG_VITEST_MIGRATIONS_FOLDER,
  TYPED_PG_VITEST_MIGRATIONS_TABLE_NAME,
  type TypedPgVitestDatabaseUrls,
} from './plugin-context'
import { createTestingPostgres } from './postgres'

interface MigrationFileModule {
  up?: (builder: SchemaBuilder) => void
}

async function migrateTestingDatabase(project: TestProject, databaseUrl: string) {
  const migrationsFolder = resolve(project.config.root, TYPED_PG_VITEST_MIGRATIONS_FOLDER)
  const files = globSync(join(migrationsFolder, '*.ts')).sort()

  if (!files.length) return

  const sql = createTestingPostgres(databaseUrl)
  const client = createClient(sql)

  try {
    await client.raw(`CREATE TABLE IF NOT EXISTS ${TYPED_PG_VITEST_MIGRATIONS_TABLE_NAME} (
      "name" varchar(255) NULL,
      migration_time timestamptz NULL,
      CONSTRAINT ${TYPED_PG_VITEST_MIGRATIONS_TABLE_NAME}_pkey PRIMARY KEY (name)
    )`)

    const appliedMigrations = new Set(
      (
        await client.raw<{ name: string }>(
          `SELECT name FROM ${TYPED_PG_VITEST_MIGRATIONS_TABLE_NAME}`,
        )
      ).map((migration) => migration.name),
    )

    for (const file of files) {
      const name = basename(file, '.ts')

      if (appliedMigrations.has(name)) continue

      const migrationModule = (await project.vite.ssrLoadModule(file)) as MigrationFileModule

      if (typeof migrationModule.up !== 'function') {
        throw Error(`Migration file must export an up(builder) function: ${file}`)
      }

      const builder = new SchemaBuilder(client)

      migrationModule.up(builder)
      await builder.run()
      await client.raw(
        `INSERT INTO ${TYPED_PG_VITEST_MIGRATIONS_TABLE_NAME} (name, migration_time) VALUES (?, NOW())`,
        name,
      )
      appliedMigrations.add(name)
    }
  } finally {
    await client.quit()
  }
}

async function startWorkerTestingServer(project: TestProject) {
  const testingServer = await startPGliteServer()

  try {
    await migrateTestingDatabase(project, testingServer.databaseUrl)
  } catch (error) {
    await testingServer.stop()
    throw error
  }

  return testingServer
}

async function stopTestingServers(testingServers: StartedPGliteServer[]) {
  await Promise.allSettled(testingServers.map((testingServer) => testingServer.stop()))
}

/**
 * Vitest global setup for {@link TypedPgVitestPlugin}.
 *
 * A dedicated temporary database is created for each Vitest worker pool slot so file-parallel test
 * runs do not share mutable state.
 *
 * @param {TestProject} project - Active Vitest project.
 * @returns Teardown function that stops the temporary database servers.
 */
export async function setup(project: TestProject) {
  const workerCount = Math.max(1, project.config.maxWorkers || 1)
  const testingServers: StartedPGliteServer[] = []
  const databaseUrls: TypedPgVitestDatabaseUrls = {}

  try {
    for (let workerId = 1; workerId <= workerCount; workerId += 1) {
      const testingServer = await startWorkerTestingServer(project)

      testingServers.push(testingServer)
      databaseUrls[String(workerId)] = testingServer.databaseUrl
    }
  } catch (error) {
    await stopTestingServers(testingServers)
    throw error
  }

  project.provide(TYPED_PG_VITEST_DATABASE_URLS_KEY, databaseUrls)

  return async () => {
    await stopTestingServers(testingServers)
  }
}
