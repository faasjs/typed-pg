import { existsSync, globSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { Migrator, SchemaBuilder, createClient, type Client } from 'typed-pg'
import type { TestProject } from 'vitest/node'

import { startPGliteServer, type StartedPGliteServer } from './pglite'
import {
  TYPED_PG_VITEST_DATABASE_URLS_KEY,
  TYPED_PG_VITEST_MIGRATIONS_FOLDER,
  type TypedPgVitestDatabaseUrls,
} from './plugin-context'
import { resolveVitestWorkerCount } from './vitest-worker-count'

async function runSchemaBuilderStatements(builder: SchemaBuilder) {
  const statements = builder
    .toSQL()
    .map((statement) => statement.trim())
    .filter(Boolean)

  if (!statements.length) return

  const client = Reflect.get(builder as object, 'client') as Client

  await client.transaction(async (db: Client) => {
    for (const statement of statements) {
      await db.raw(statement)
    }
  })

  // Preserve `SchemaBuilder.run()` semantics so retries don't re-run already applied statements.
  Reflect.set(builder as object, 'changes', [])
}

async function migrateTestingDatabase(project: TestProject, databaseUrl: string) {
  const migrationsFolder = resolve(project.config.root, TYPED_PG_VITEST_MIGRATIONS_FOLDER)
  if (!existsSync(migrationsFolder)) return
  if (!globSync(join(migrationsFolder, '*.ts')).length) return

  const client = createClient(databaseUrl, {
    max: 1,
    ssl: false,
  })
  const originalRun = Object.getOwnPropertyDescriptor(SchemaBuilder.prototype, 'run')?.value as
    | ((this: SchemaBuilder) => Promise<void>)
    | undefined

  try {
    if (!originalRun) {
      throw Error('SchemaBuilder.run() is required for typed-pg test setup.')
    }

    SchemaBuilder.prototype.run = async function patchedRun(this: SchemaBuilder) {
      await runSchemaBuilderStatements(this)
    }

    await new Migrator({ client, folder: migrationsFolder }).migrate()
  } finally {
    if (originalRun) {
      SchemaBuilder.prototype.run = originalRun
    }

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
async function setup(project: TestProject) {
  const workerCount = resolveVitestWorkerCount(project)
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

export default setup
