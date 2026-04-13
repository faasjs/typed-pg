import { beforeEach, describe, expect, it, vi } from 'vitest'

type MigrationRow = { name: string }
type ClientLike = {
  raw: ReturnType<typeof vi.fn>
  quit: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted(() => ({
  globSync: vi.fn<(pattern: string) => string[]>(),
  startPGliteServer: vi.fn<() => Promise<{ databaseUrl: string; stop: () => Promise<void> }>>(),
  createTestingPostgres: vi.fn<(databaseUrl: string) => { databaseUrl: string }>(),
  createClient: vi.fn<(sql: { databaseUrl: string }) => ClientLike>(),
  schemaBuilder: vi.fn<(client: ClientLike) => void>(),
  schemaRun: vi.fn<() => Promise<void>>(),
}))

vi.mock('node:fs', () => ({
  globSync: mocks.globSync,
}))

vi.mock('../pglite', () => ({
  startPGliteServer: mocks.startPGliteServer,
}))

vi.mock('../postgres', () => ({
  createTestingPostgres: mocks.createTestingPostgres,
}))

vi.mock('typed-pg', () => ({
  SchemaBuilder: function SchemaBuilder(client: ClientLike) {
    mocks.schemaBuilder(client)
    return {
      run: mocks.schemaRun,
    }
  },
  createClient: mocks.createClient,
}))

function createTestingServer(databaseUrl: string) {
  return {
    databaseUrl,
    stop: vi.fn(async () => undefined),
  }
}

describe('typed-pg-vitest global setup', () => {
  let clients: ClientLike[]
  let appliedMigrationsQueue: MigrationRow[][]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    clients = []
    appliedMigrationsQueue = []

    mocks.globSync.mockReturnValue([])
    mocks.createTestingPostgres.mockImplementation((databaseUrl) => ({ databaseUrl }))
    mocks.createClient.mockImplementation(() => {
      const appliedMigrations = appliedMigrationsQueue.shift() ?? []
      const client = {
        raw: vi.fn(async (query: string) => {
          if (query.includes('SELECT name FROM typed_pg_migrations')) return appliedMigrations
          return []
        }),
        quit: vi.fn(async () => undefined),
      }

      clients.push(client)
      return client
    })
    mocks.schemaRun.mockResolvedValue(undefined)
  })

  it('creates one temporary database per worker and tears them all down', async () => {
    const workerOneServer = createTestingServer('postgresql://worker-1')
    const workerTwoServer = createTestingServer('postgresql://worker-2')
    const firstMigrationFile = '/repo/migrations/20250101000000_first.ts'
    const secondMigrationFile = '/repo/migrations/20250102000000_second.ts'
    const firstMigration = vi.fn()
    const secondMigration = vi.fn()
    const loadModule = vi.fn(async (file: string) => {
      if (file === firstMigrationFile) return { up: firstMigration }
      if (file === secondMigrationFile) return { up: secondMigration }
      throw Error(`Unexpected migration file: ${file}`)
    })
    const provide = vi.fn()
    const project = {
      config: {
        maxWorkers: 2,
        root: '/repo',
      },
      provide,
      vite: {
        ssrLoadModule: loadModule,
      },
    }

    mocks.globSync.mockReturnValue([firstMigrationFile, secondMigrationFile])
    mocks.startPGliteServer
      .mockResolvedValueOnce(workerOneServer)
      .mockResolvedValueOnce(workerTwoServer)
    appliedMigrationsQueue.push([{ name: '20250101000000_first' }], [])

    const { setup } = await import('../typed-pg-vitest-global-setup')
    const teardown = await setup(project as never)

    expect(mocks.createTestingPostgres).toHaveBeenNthCalledWith(1, workerOneServer.databaseUrl)
    expect(mocks.createTestingPostgres).toHaveBeenNthCalledWith(2, workerTwoServer.databaseUrl)
    expect(loadModule).toHaveBeenCalledTimes(3)
    expect(firstMigration).toHaveBeenCalledTimes(1)
    expect(secondMigration).toHaveBeenCalledTimes(2)
    expect(mocks.schemaBuilder).toHaveBeenCalledTimes(3)
    expect(mocks.schemaRun).toHaveBeenCalledTimes(3)
    expect(clients).toHaveLength(2)
    expect(clients[0].quit).toHaveBeenCalledTimes(1)
    expect(clients[1].quit).toHaveBeenCalledTimes(1)
    expect(provide).toHaveBeenCalledWith('__typedPgVitestDatabaseUrls', {
      '1': workerOneServer.databaseUrl,
      '2': workerTwoServer.databaseUrl,
    })

    await teardown()

    expect(workerOneServer.stop).toHaveBeenCalledTimes(1)
    expect(workerTwoServer.stop).toHaveBeenCalledTimes(1)
  })

  it('defaults to a single worker when maxWorkers is not configured', async () => {
    const workerServer = createTestingServer('postgresql://worker-1')
    const provide = vi.fn()
    const project = {
      config: {
        root: '/repo',
      },
      provide,
      vite: {
        ssrLoadModule: vi.fn(),
      },
    }

    mocks.startPGliteServer.mockResolvedValueOnce(workerServer)

    const { setup } = await import('../typed-pg-vitest-global-setup')
    const teardown = await setup(project as never)

    expect(mocks.createTestingPostgres).not.toHaveBeenCalled()
    expect(provide).toHaveBeenCalledWith('__typedPgVitestDatabaseUrls', {
      '1': workerServer.databaseUrl,
    })

    await teardown()

    expect(workerServer.stop).toHaveBeenCalledTimes(1)
  })

  it('stops the worker server when a migration file does not export up', async () => {
    const workerServer = createTestingServer('postgresql://worker-1')
    const project = {
      config: {
        maxWorkers: 1,
        root: '/repo',
      },
      provide: vi.fn(),
      vite: {
        ssrLoadModule: vi.fn(async () => ({})),
      },
    }

    mocks.globSync.mockReturnValue(['/repo/migrations/20250101000000_invalid.ts'])
    mocks.startPGliteServer.mockResolvedValueOnce(workerServer)

    const { setup } = await import('../typed-pg-vitest-global-setup')

    await expect(setup(project as never)).rejects.toThrowError(
      /Migration file must export an up\(builder\) function/,
    )

    expect(workerServer.stop).toHaveBeenCalledTimes(1)
    expect(project.provide).not.toHaveBeenCalled()
    expect(clients).toHaveLength(1)
    expect(clients[0].quit).toHaveBeenCalledTimes(1)
  })

  it('stops previously started servers when a later worker fails to start', async () => {
    const workerOneServer = createTestingServer('postgresql://worker-1')
    const project = {
      config: {
        maxWorkers: 2,
        root: '/repo',
      },
      provide: vi.fn(),
      vite: {
        ssrLoadModule: vi.fn(),
      },
    }

    mocks.startPGliteServer
      .mockResolvedValueOnce(workerOneServer)
      .mockRejectedValueOnce(Error('start failed'))

    const { setup } = await import('../typed-pg-vitest-global-setup')

    await expect(setup(project as never)).rejects.toThrowError('start failed')

    expect(workerOneServer.stop).toHaveBeenCalledTimes(1)
    expect(mocks.createTestingPostgres).not.toHaveBeenCalled()
    expect(project.provide).not.toHaveBeenCalled()
  })
})
