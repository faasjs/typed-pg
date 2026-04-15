import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type PostgresFactory = (...args: any[]) => unknown

const postgresMock = vi.hoisted(() => vi.fn<PostgresFactory>())
const exampleUrl = 'postgres://typed-pg.test/example'

vi.mock('postgres', () => ({
  default: postgresMock,
}))

async function loadClientModule() {
  return import('../client')
}

function createSqlMock() {
  const sql = vi.fn<(...args: any[]) => Promise<unknown[]>>(async () => [])

  return Object.assign(sql, {
    end: vi.fn<() => Promise<void>>(async () => undefined),
  })
}

type ClientModule = Awaited<ReturnType<typeof loadClientModule>>
type ClientInstance = InstanceType<ClientModule['Client']>
type SqlMock = ReturnType<typeof createSqlMock>

function lastSqlMock() {
  const sql = postgresMock.mock.results.at(-1)?.value

  if (!sql) throw new Error('Expected postgres to be called')

  return sql as SqlMock
}

function sqlMockFor(client: ClientInstance) {
  return client.postgres as unknown as SqlMock
}

describe('createClient', () => {
  let clientModule: ClientModule
  let previousDatabaseUrl: string | undefined

  beforeEach(async () => {
    postgresMock.mockReset()
    postgresMock.mockImplementation(() => createSqlMock())
    previousDatabaseUrl = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    vi.resetModules()
    clientModule = await loadClientModule()
  })

  afterEach(() => {
    if (typeof previousDatabaseUrl === 'string') process.env.DATABASE_URL = previousDatabaseUrl
    else delete process.env.DATABASE_URL
    vi.restoreAllMocks()
  })

  it('forwards a connection string and options to postgres', () => {
    const options = { max: 1, ssl: false }

    const client = clientModule.createClient(exampleUrl, options)

    expect(postgresMock).toHaveBeenCalledWith(exampleUrl, options)
    expect(client.postgres).toBe(lastSqlMock())
  })

  it('forwards a connection string without options to postgres', () => {
    const client = clientModule.createClient(exampleUrl)

    expect(postgresMock).toHaveBeenCalledWith(exampleUrl, undefined)
    expect(client.postgres).toBe(lastSqlMock())
  })

  it('allows Client to be constructed with the same connection-string arguments', () => {
    const options = { max: 1, ssl: false }

    const client = new clientModule.Client(exampleUrl, options)

    expect(postgresMock).toHaveBeenCalledWith(exampleUrl, options)
    expect(client.postgres).toBe(lastSqlMock())
    expect(clientModule.getClient(exampleUrl)).toBe(client)
  })

  it('rejects non-string constructor arguments', () => {
    expect(() => new clientModule.Client(Symbol('invalid') as unknown as string)).toThrowError(
      'Client constructor only accepts a connection URL and optional options',
    )
    expect(postgresMock).not.toHaveBeenCalled()
  })

  it('creates an internal logger', () => {
    const options = { max: 1 }

    const client = clientModule.createClient(exampleUrl, options)

    expect(postgresMock).toHaveBeenCalledWith(exampleUrl, options)
    expect(client.logger).toBeDefined()
  })

  it('skips debug logging when logger level is not debug', async () => {
    const client = new clientModule.Client(exampleUrl)
    const sql = sqlMockFor(client)
    client.logger.level = 'info'

    const timeSpy = vi.spyOn(client.logger, 'time')

    expect(await client.raw('SELECT 1')).toEqual([])
    expect(timeSpy).not.toHaveBeenCalled()
    expect(sql).toHaveBeenCalledTimes(1)
  })

  it('records timing in debug mode', async () => {
    const client = new clientModule.Client(exampleUrl)
    const sql = sqlMockFor(client)

    const timeSpy = vi.spyOn(client.logger, 'time')
    const timeEndSpy = vi.spyOn(client.logger, 'timeEnd')

    expect(await client.raw('SELECT ?::integer', 1)).toEqual([])
    expect(sql).toHaveBeenCalledTimes(1)
    expect(timeSpy).toHaveBeenCalledTimes(1)
    expect(timeEndSpy).toHaveBeenCalledTimes(1)
  })

  it('logs and rethrows query errors in debug mode', async () => {
    const client = new clientModule.Client(exampleUrl)
    const sql = sqlMockFor(client)

    sql.mockImplementation(async () => {
      throw new Error('raw failed')
    })

    const timeEndSpy = vi.spyOn(client.logger, 'timeEnd')
    const errorSpy = vi.spyOn(client.logger, 'error')

    await expect(client.raw('SELECT 1')).rejects.toThrowError('raw failed')
    expect(timeEndSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledTimes(1)
  })

  it('caches clients by connection string and resolves the only cached client without a url', () => {
    const client = clientModule.createClient(exampleUrl)

    expect(clientModule.getClient(exampleUrl)).toBe(client)
    expect(clientModule.getClient()).toBe(client)
  })

  it('returns undefined without a url when multiple cached clients exist', () => {
    const firstClient = clientModule.createClient('postgres://typed-pg.test/first')
    const secondClient = clientModule.createClient('postgres://typed-pg.test/second')

    expect(clientModule.getClient('postgres://typed-pg.test/first')).toBe(firstClient)
    expect(clientModule.getClient('postgres://typed-pg.test/second')).toBe(secondClient)
    expect(clientModule.getClient()).toBeUndefined()
  })

  it('creates and caches a client from DATABASE_URL when the cache is empty', () => {
    process.env.DATABASE_URL = exampleUrl

    const client = clientModule.getClient()

    expect(client).toBeDefined()
    expect(postgresMock).toHaveBeenCalledWith(exampleUrl, undefined)
    expect(clientModule.getClient(exampleUrl)).toBe(client)
    expect(clientModule.getClient()).toBe(client)
    expect(postgresMock).toHaveBeenCalledTimes(1)
  })

  it('returns all cached clients without requiring a url', () => {
    const firstClient = clientModule.createClient('postgres://typed-pg.test/first')
    const secondClient = clientModule.createClient('postgres://typed-pg.test/second')

    expect(clientModule.getClients()).toEqual([firstClient, secondClient])
  })

  it('returns a snapshot of the cached clients', () => {
    const client = clientModule.createClient(exampleUrl)
    const cachedClients = clientModule.getClients()

    cachedClients.pop()

    expect(cachedClients).toEqual([])
    expect(clientModule.getClients()).toEqual([client])
  })

  it('removes the cached client on quit without evicting a newer client for the same url', async () => {
    const firstClient = clientModule.createClient(exampleUrl)
    const secondClient = clientModule.createClient(exampleUrl)
    const firstSql = sqlMockFor(firstClient)
    const secondSql = sqlMockFor(secondClient)

    await expect(firstClient.quit()).resolves.toBeUndefined()
    expect(firstSql.end).toHaveBeenCalledTimes(1)
    expect(clientModule.getClient(exampleUrl)).toBe(secondClient)

    await expect(secondClient.quit()).resolves.toBeUndefined()
    expect(secondSql.end).toHaveBeenCalledTimes(1)
    expect(clientModule.getClient(exampleUrl)).toBeUndefined()
    expect(clientModule.getClients()).toEqual([])
  })
})
