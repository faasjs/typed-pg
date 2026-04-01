import postgres, { type Options, type PostgresType } from 'postgres'

export const DEFAULT_DATABASE_URL_ENV = 'DATABASE_URL'
export const DEFAULT_TESTING_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/template1?sslmode=disable'

export interface GetTestingDatabaseUrlOptions {
  envName?: string
  fallback?: string
}

export type CreateTestingPostgresOptions<
  T extends Record<string, PostgresType> = Record<string, never>,
> = Options<T> & {
  databaseUrl?: string
  envName?: string
  fallbackDatabaseUrl?: string
}

export function getTestingDatabaseUrl(options: GetTestingDatabaseUrlOptions = {}) {
  return (
    process.env[options.envName ?? DEFAULT_DATABASE_URL_ENV] ??
    options.fallback ??
    DEFAULT_TESTING_DATABASE_URL
  )
}

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
