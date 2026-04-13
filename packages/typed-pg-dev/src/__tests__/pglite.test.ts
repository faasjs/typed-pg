import postgres from 'postgres'
import { describe, expect, it } from 'vitest'

import { startPGliteServer } from '../pglite'

describe('pglite helpers', () => {
  it('starts a pglite socket server with a working postgres url', async () => {
    const testingServer = await startPGliteServer()
    const sql = postgres(testingServer.databaseUrl, { max: 1, ssl: false })

    try {
      const [row] = await sql<{ value: number }[]>`select 1 as value`

      expect(row?.value).toBe(1)
    } finally {
      await sql.end()
      await testingServer.stop()
    }
  })
})
