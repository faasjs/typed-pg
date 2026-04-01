import { randomUUID } from 'node:crypto'

import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

import { DEFAULT_DATABASE_URL_ENV } from './postgres'

export interface CreatePGliteDatabaseUrlOptions {
  database?: string
  password?: string
  searchParams?: Record<string, string | number | boolean>
  username?: string
}

export interface StartPGliteServerOptions extends CreatePGliteDatabaseUrlOptions {
  dataDir?: string
  host?: string
  port?: number
}

export interface CreateVitestSetupOptions extends StartPGliteServerOptions {
  envName?: string
}

export interface StartedPGliteServer {
  databaseUrl: string
  db: PGlite
  server: PGLiteSocketServer
  serverConn: string
  stop(): Promise<void>
}

const DEFAULT_DATABASE_NAME = 'template1'
const DEFAULT_DATABASE_PASSWORD = 'postgres'
const DEFAULT_DATABASE_USERNAME = 'postgres'
const DEFAULT_HOST = '127.0.0.1'

function parseServerConn(serverConn: string) {
  const separatorIndex = serverConn.lastIndexOf(':')

  if (separatorIndex <= 0 || separatorIndex === serverConn.length - 1) {
    throw Error(`Invalid pglite socket server address: ${serverConn}`)
  }

  return {
    host: serverConn.slice(0, separatorIndex),
    port: serverConn.slice(separatorIndex + 1),
  }
}

export function createPGliteDatabaseUrl(
  serverConn: string,
  options: CreatePGliteDatabaseUrlOptions = {},
) {
  const { host, port } = parseServerConn(serverConn)
  const hostname = host.includes(':') ? `[${host}]` : host
  const url = new URL(
    `postgresql://${encodeURIComponent(options.username ?? DEFAULT_DATABASE_USERNAME)}:${encodeURIComponent(
      options.password ?? DEFAULT_DATABASE_PASSWORD,
    )}@${hostname}:${port}/${options.database ?? DEFAULT_DATABASE_NAME}`,
  )

  url.searchParams.set('sslmode', 'disable')

  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

export async function startPGliteServer(
  options: StartPGliteServerOptions = {},
): Promise<StartedPGliteServer> {
  const db = await PGlite.create(options.dataDir ?? `memory://${randomUUID()}`)
  const server = new PGLiteSocketServer({
    db,
    host: options.host ?? DEFAULT_HOST,
    port: options.port ?? 0,
  })

  try {
    await server.start()
  } catch (error) {
    await db.close()
    throw error
  }

  const serverConn = server.getServerConn()
  const databaseUrl = createPGliteDatabaseUrl(serverConn, options)
  let stopped = false

  return {
    db,
    server,
    serverConn,
    databaseUrl,
    async stop() {
      if (stopped) return

      stopped = true
      await server.stop()
      await db.close()
    },
  }
}

export function createVitestSetup(options: CreateVitestSetupOptions = {}) {
  return async function globalSetup() {
    const envName = options.envName ?? DEFAULT_DATABASE_URL_ENV
    const previousDatabaseUrl = process.env[envName]
    const testingServer = await startPGliteServer(options)

    process.env[envName] = testingServer.databaseUrl

    return async () => {
      if (typeof previousDatabaseUrl === 'string') process.env[envName] = previousDatabaseUrl
      else delete process.env[envName]

      await testingServer.stop()
    }
  }
}
