import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

function createDatabaseUrl(serverConn: string) {
  const [host, port] = serverConn.split(':')

  if (!host || !port)
    throw Error(`Invalid pglite socket server address: ${serverConn}`)

  return `postgresql://postgres:postgres@${host}:${port}/template1?sslmode=disable`
}

export default async function globalSetup() {
  const db = await PGlite.create(`memory://${randomUUID()}`)
  const server = new PGLiteSocketServer({
    db,
    host: '127.0.0.1',
    port: 0,
  })

  await server.start()

  const previousDatabaseUrl = process.env.DATABASE_URL
  process.env.DATABASE_URL = createDatabaseUrl(server.getServerConn())

  return async () => {
    if (typeof previousDatabaseUrl === 'string')
      process.env.DATABASE_URL = previousDatabaseUrl
    else
      delete process.env.DATABASE_URL

    await server.stop()
    await db.close()
  }
}
