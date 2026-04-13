import { randomUUID } from 'node:crypto'

import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

/**
 * Started PGlite server handle used by `TypedPgVitestPlugin`.
 */
export interface StartedPGliteServer {
  databaseUrl: string
  stop(): Promise<void>
}

const DEFAULT_DATABASE_NAME = 'template1'
const DEFAULT_DATABASE_PASSWORD = 'postgres'
const DEFAULT_DATABASE_USERNAME = 'postgres'
const DEFAULT_HOST = '127.0.0.1'

function createPGliteDatabaseUrl(serverConn: string) {
  const separatorIndex = serverConn.lastIndexOf(':')

  if (separatorIndex <= 0 || separatorIndex === serverConn.length - 1) {
    throw Error(`Invalid pglite socket server address: ${serverConn}`)
  }

  const host = serverConn.slice(0, separatorIndex)
  const port = serverConn.slice(separatorIndex + 1)
  const hostname = host.includes(':') ? `[${host}]` : host
  const url = new URL(
    `postgresql://${encodeURIComponent(DEFAULT_DATABASE_USERNAME)}:${encodeURIComponent(
      DEFAULT_DATABASE_PASSWORD,
    )}@${hostname}:${port}/${DEFAULT_DATABASE_NAME}`,
  )

  url.searchParams.set('sslmode', 'disable')

  return url.toString()
}

/**
 * Starts a temporary PGlite socket server and returns its lifecycle handle.
 *
 * @returns Started server handle with a `stop()` method.
 */
export async function startPGliteServer(): Promise<StartedPGliteServer> {
  const db = await PGlite.create(`memory://${randomUUID()}`)
  const server = new PGLiteSocketServer({
    db,
    host: DEFAULT_HOST,
    port: 0,
  })

  try {
    await server.start()
  } catch (error) {
    await db.close()
    throw error
  }

  const serverConn = server.getServerConn()
  const databaseUrl = createPGliteDatabaseUrl(serverConn)
  let stopped = false

  return {
    databaseUrl,
    async stop() {
      if (stopped) return

      stopped = true
      await server.stop()
      await db.close()
    },
  }
}
