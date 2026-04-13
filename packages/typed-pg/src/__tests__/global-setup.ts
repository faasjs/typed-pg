import { startPGliteServer } from '../../../typed-pg-dev/src/pglite'

const DATABASE_URL_ENV_NAME = 'DATABASE_URL'

export default async function globalSetup() {
  const previousDatabaseUrl = process.env[DATABASE_URL_ENV_NAME]
  const testingServer = await startPGliteServer()

  process.env[DATABASE_URL_ENV_NAME] = testingServer.databaseUrl

  return async () => {
    if (typeof previousDatabaseUrl === 'string')
      process.env[DATABASE_URL_ENV_NAME] = previousDatabaseUrl
    else delete process.env[DATABASE_URL_ENV_NAME]

    await testingServer.stop()
  }
}
