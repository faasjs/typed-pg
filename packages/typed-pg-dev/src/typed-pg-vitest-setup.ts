import { beforeEach, inject } from 'vitest'

import {
  TYPED_PG_VITEST_DATABASE_URL_ENV_NAME,
  TYPED_PG_VITEST_DATABASE_URLS_KEY,
  TYPED_PG_VITEST_RESET_EXCLUDE_TABLES,
  requireTypedPgVitestDatabaseUrl,
} from './plugin-context'
import { createTestingPostgres } from './postgres'
import { resetTestingDatabase } from './testing'

const databaseUrls = inject(TYPED_PG_VITEST_DATABASE_URLS_KEY)
const databaseUrl = requireTypedPgVitestDatabaseUrl(databaseUrls)

process.env[TYPED_PG_VITEST_DATABASE_URL_ENV_NAME] = databaseUrl

beforeEach(async () => {
  const sql = createTestingPostgres(databaseUrl)

  try {
    await resetTestingDatabase(sql, TYPED_PG_VITEST_RESET_EXCLUDE_TABLES)
  } finally {
    await sql.end()
  }
})
