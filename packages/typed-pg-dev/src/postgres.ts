import postgres, { type Options, type PostgresType } from 'postgres'

/**
 * Default environment variable name used to resolve the testing database URL.
 */
export const DEFAULT_DATABASE_URL_ENV = 'DATABASE_URL'

/**
 * Default PostgreSQL connection string used by local testing helpers.
 */
export const DEFAULT_TESTING_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/template1?sslmode=disable'

/**
 * Options for resolving the testing database URL.
 */
export interface GetTestingDatabaseUrlOptions {
  envName?: string
  fallback?: string
}

/**
 * Options for creating a `postgres.js` testing client.
 */
export type CreateTestingPostgresOptions<
  T extends Record<string, PostgresType> = Record<string, never>,
> = Options<T> & {
  databaseUrl?: string
  envName?: string
  fallbackDatabaseUrl?: string
}

/**
 * Resolves the database URL used by local testing helpers.
 *
 * @param {GetTestingDatabaseUrlOptions} [options] - Optional environment name or fallback URL.
 * @returns Testing database URL string.
 */
export function getTestingDatabaseUrl(options: GetTestingDatabaseUrlOptions = {}) {
  return (
    process.env[options.envName ?? DEFAULT_DATABASE_URL_ENV] ??
    options.fallback ??
    DEFAULT_TESTING_DATABASE_URL
  )
}

/**
 * Creates a `postgres.js` client configured for `typed-pg` tests.
 *
 * Defaults to a single connection and disabled SSL so the client works with the bundled PGlite
 * socket server setup.
 *
 * @param {CreateTestingPostgresOptions<T>} [options] - Optional testing database and driver
 * overrides.
 * @returns Configured `postgres.js` client instance.
 */
export function createTestingPostgres<
  T extends Record<string, PostgresType> = Record<string, never>,
>(options: CreateTestingPostgresOptions<T> = {} as CreateTestingPostgresOptions<T>) {
  const {
    databaseUrl,
    envName,
    fallbackDatabaseUrl,
    max = 1,
    ssl = false,
    ...postgresOptions
  } = options
  const databaseUrlOptions: GetTestingDatabaseUrlOptions = {}

  if (typeof envName === 'string') databaseUrlOptions.envName = envName
  if (typeof fallbackDatabaseUrl === 'string') databaseUrlOptions.fallback = fallbackDatabaseUrl

  return postgres<T>(databaseUrl ?? getTestingDatabaseUrl(databaseUrlOptions), {
    max,
    ssl,
    ...postgresOptions,
  })
}
