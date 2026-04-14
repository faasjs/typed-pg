import { TYPED_PG_VITEST_DATABASE_URL_ENV_NAME } from '../../../typed-pg-dev/src/plugin-context'

export { createTestingPostgres } from '../../../typed-pg-dev/src/postgres'

function requireTestingDatabaseUrl(databaseUrl?: string) {
  const resolvedDatabaseUrl = databaseUrl ?? process.env[TYPED_PG_VITEST_DATABASE_URL_ENV_NAME]

  if (!resolvedDatabaseUrl) {
    throw Error('TypedPgVitestPlugin requires process.env.DATABASE_URL to be set.')
  }

  return resolvedDatabaseUrl
}

export function createTestingClientArgs(databaseUrl?: string) {
  return [
    requireTestingDatabaseUrl(databaseUrl),
    {
      max: 1,
      ssl: false,
    },
  ] as const
}
