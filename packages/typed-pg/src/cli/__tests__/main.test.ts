import { beforeEach, describe, expect, it, vi } from 'vitest'

type VoidMock = (...args: any[]) => void
type AnyMock = (...args: any[]) => unknown
type AsyncVoidMock = (...args: any[]) => Promise<void>
type AsyncRowsMock<T> = (...args: any[]) => Promise<T[]>

const {
  logger,
  postgresMock,
  createClientMock,
  migratorState,
  migratorCtorSpy,
  existsSyncMock,
  mkdirSyncMock,
  writeFileSyncMock,
} = vi.hoisted(() => ({
  logger: {
    debug: vi.fn<VoidMock>(),
    info: vi.fn<VoidMock>(),
    error: vi.fn<VoidMock>(),
    time: vi.fn<VoidMock>(),
    timeEnd: vi.fn<VoidMock>(),
  },
  postgresMock: vi.fn<AnyMock>(),
  createClientMock: vi.fn<AnyMock>(() => ({ client: true })),
  migratorState: {
    status: vi.fn<AsyncRowsMock<{ name: string; migration_time: Date }>>(async () => []),
    migrate: vi.fn<AsyncVoidMock>(async () => undefined),
    up: vi.fn<AsyncVoidMock>(async () => undefined),
    down: vi.fn<AsyncVoidMock>(async () => undefined),
  },
  migratorCtorSpy: vi.fn<VoidMock>(),
  existsSyncMock: vi.fn<() => boolean>(() => true),
  mkdirSyncMock: vi.fn<VoidMock>(),
  writeFileSyncMock: vi.fn<VoidMock>(),
}))

vi.mock('postgres', () => ({
  default: postgresMock,
}))

vi.mock('@faasjs/node-utils', () => ({
  Logger: function Logger() {
    return logger
  },
}))

vi.mock('../../client', () => ({
  createClient: createClientMock,
}))

vi.mock('../../migrator', () => ({
  Migrator: function Migrator(options: any) {
    migratorCtorSpy(options)
    return migratorState
  },
}))

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
  globSync: vi.fn<() => string[]>(),
  mkdirSync: mkdirSyncMock,
  writeFileSync: writeFileSyncMock,
}))

import { main } from '../main'

function mockConnectedPostgres() {
  const sql = Object.assign(
    vi.fn<AsyncRowsMock<unknown>>(async () => []),
    {
      end: vi.fn<AsyncVoidMock>(async () => undefined),
    },
  )
  postgresMock.mockReturnValue(sql)
  return sql
}

describe('cli/main', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.DATABASE_URL =
      'postgresql://postgres:postgres@127.0.0.1:5432/template1?sslmode=disable'
    process.argv = ['node', 'typed-pg']

    existsSyncMock.mockReturnValue(true)

    migratorState.status.mockResolvedValue([])
    migratorState.migrate.mockResolvedValue(undefined)
    migratorState.up.mockResolvedValue(undefined)
    migratorState.down.mockResolvedValue(undefined)
  })

  it('logs error when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL

    await expect(main('status')).resolves.toBe(1)

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL not set'))
    expect(postgresMock).not.toHaveBeenCalled()
  })

  it('logs error on failed database connection', async () => {
    const sql = Object.assign(
      vi.fn<(...args: any[]) => Promise<never>>(async () => {
        throw new Error('ECONNREFUSED')
      }),
      {
        end: vi.fn<AsyncVoidMock>(async () => undefined),
      },
    )
    postgresMock.mockReturnValue(sql)

    await expect(main('status')).resolves.toBe(1)

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error connecting to database, please check your DATABASE_URL\n'),
      expect.any(Error),
    )
    expect(sql.end).toHaveBeenCalledTimes(1)
  })

  it('prints operation help when no operation is provided', async () => {
    await expect(main('' as any)).resolves.toBe(1)

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Please provide a operation to run'),
    )
    expect(postgresMock).not.toHaveBeenCalled()
  })

  it('runs status operation', async () => {
    const sql = mockConnectedPostgres()
    const migrationTime = new Date('2025-01-01T00:00:00.000Z')

    migratorState.status.mockResolvedValue([
      { name: '20250101000000_init', migration_time: migrationTime },
    ])

    await expect(main('status')).resolves.toBe(0)

    expect(createClientMock).toHaveBeenCalledWith(sql)
    expect(migratorCtorSpy).toHaveBeenCalledWith({
      client: { client: true },
      folder: 'migrations',
    })
    expect(migratorState.status).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith('Status:')
    expect(logger.info).toHaveBeenCalledWith(`- 20250101000000_init (${String(migrationTime)})`)
    expect(sql.end).toHaveBeenCalledTimes(1)
  })

  it('runs migrate operation', async () => {
    mockConnectedPostgres()

    await expect(main('migrate')).resolves.toBe(0)

    expect(migratorState.migrate).toHaveBeenCalledTimes(1)
  })

  it('runs up operation', async () => {
    mockConnectedPostgres()

    await expect(main('up')).resolves.toBe(0)

    expect(migratorState.up).toHaveBeenCalledTimes(1)
  })

  it('runs down operation', async () => {
    mockConnectedPostgres()

    await expect(main('down')).resolves.toBe(0)

    expect(migratorState.down).toHaveBeenCalledTimes(1)
  })

  it('shows error when creating migration without name without touching the database', async () => {
    process.argv[3] = ''

    await expect(main('new')).resolves.toBe(1)

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Please provide a name for the migration'),
    )
    expect(postgresMock).not.toHaveBeenCalled()
    expect(migratorCtorSpy).not.toHaveBeenCalled()
  })

  it('creates migration file and folder when folder is missing without touching the database', async () => {
    process.argv[3] = 'create_users'
    existsSyncMock.mockReturnValue(false)

    await expect(main('new')).resolves.toBe(0)

    expect(mkdirSyncMock).toHaveBeenCalledTimes(1)
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1)
    expect(String(writeFileSyncMock.mock.calls[0][0])).toContain('-create_users.ts')
    expect(String(writeFileSyncMock.mock.calls[0][1])).toContain('export function up')
    expect(logger.info).toHaveBeenCalledWith('Created migration:', expect.any(String))
    expect(postgresMock).not.toHaveBeenCalled()
    expect(migratorCtorSpy).not.toHaveBeenCalled()
  })

  it('creates migration file without creating folder when folder exists', async () => {
    process.argv[3] = 'create_posts'
    existsSyncMock.mockReturnValue(true)

    await expect(main('new')).resolves.toBe(0)

    expect(mkdirSyncMock).not.toHaveBeenCalled()
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1)
    expect(postgresMock).not.toHaveBeenCalled()
  })

  it('logs an error when the migrations folder is missing for database operations', async () => {
    const sql = mockConnectedPostgres()
    migratorCtorSpy.mockImplementationOnce(() => {
      throw new Error('Migration folder not found: /tmp/migrations')
    })

    await expect(main('status')).resolves.toBe(1)

    expect(logger.error).toHaveBeenCalledWith('Migration folder not found: /tmp/migrations')
    expect(sql.end).toHaveBeenCalledTimes(1)
  })

  it('logs unknown operation', async () => {
    await expect(main('unknown')).resolves.toBe(1)

    expect(logger.error).toHaveBeenCalledWith('Unknown operation:', 'unknown')
    expect(postgresMock).not.toHaveBeenCalled()
  })
})
