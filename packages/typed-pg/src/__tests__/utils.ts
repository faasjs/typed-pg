import { TYPED_PG_VITEST_DATABASE_URL_ENV_NAME } from '../../../typed-pg-dev/src/plugin-context'

export { createTestingPostgres } from '../../../typed-pg-dev/src/postgres'

export function requireTestingDatabaseUrl(databaseUrl?: string) {
  const resolvedDatabaseUrl = databaseUrl ?? process.env[TYPED_PG_VITEST_DATABASE_URL_ENV_NAME]

  if (!resolvedDatabaseUrl) {
    throw Error('TypedPgVitestPlugin requires process.env.DATABASE_URL to be set.')
  }

  return resolvedDatabaseUrl
}
