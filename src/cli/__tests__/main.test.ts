import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
  },
  postgresMock: vi.fn(),
  createClientMock: vi.fn(() => ({ client: true })),
  migratorState: {
    status: vi.fn(async () => [] as Array<{ name: string, migration_time: Date }>),
    migrate: vi.fn(async () => undefined),
    up: vi.fn(async () => undefined),
    down: vi.fn(async () => undefined),
  },
  migratorCtorSpy: vi.fn(),
  existsSyncMock: vi.fn(() => true),
  mkdirSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
}))

vi.mock('postgres', () => ({
  default: postgresMock,
}))

vi.mock('@faasjs/logger', () => ({
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
  globSync: vi.fn(),
  mkdirSync: mkdirSyncMock,
  writeFileSync: writeFileSyncMock,
}))

import { main } from '../main'

function mockConnectedPostgres() {
  const sql = vi.fn(async () => [])
  postgresMock.mockReturnValue(sql)
  return sql
}

describe('cli/main', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/template1?sslmode=disable'
    process.argv = ['node', 'typed-pg']

    existsSyncMock.mockReturnValue(true)

    migratorState.status.mockResolvedValue([])
    migratorState.migrate.mockResolvedValue(undefined)
    migratorState.up.mockResolvedValue(undefined)
    migratorState.down.mockResolvedValue(undefined)
  })

  it('logs error when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL

    await main('status')

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('DATABASE_URL not set')
    )
    expect(postgresMock).not.toHaveBeenCalled()
  })

  it('logs error on failed database connection', async () => {
    postgresMock.mockReturnValue(
      vi.fn(async () => {
        throw new Error('ECONNREFUSED')
      })
    )

    await main('status')

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error connecting to database, please check your DATABASE_URL\n'),
      expect.any(Error)
    )
  })

  it('prints operation help when no operation is provided', async () => {
    mockConnectedPostgres()

    await main('' as any)

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Please provide a operation to run')
    )
  })

  it('runs status operation', async () => {
    const sql = mockConnectedPostgres()
    const migrationTime = new Date('2025-01-01T00:00:00.000Z')

    migratorState.status.mockResolvedValue([
      { name: '20250101000000_init', migration_time: migrationTime },
    ])

    await main('status')

    expect(createClientMock).toHaveBeenCalledWith(sql)
    expect(migratorCtorSpy).toHaveBeenCalledWith({
      client: { client: true },
      folder: 'migrations',
    })
    expect(migratorState.status).toHaveBeenCalledTimes(1)
    expect(logger.info).toHaveBeenCalledWith('Status:')
    expect(logger.info).toHaveBeenCalledWith(`- 20250101000000_init (${migrationTime})`)
  })

  it('runs migrate operation', async () => {
    mockConnectedPostgres()

    await main('migrate')

    expect(migratorState.migrate).toHaveBeenCalledTimes(1)
  })

  it('runs up operation', async () => {
    mockConnectedPostgres()

    await main('up')

    expect(migratorState.up).toHaveBeenCalledTimes(1)
  })

  it('runs down operation', async () => {
    mockConnectedPostgres()

    await main('down')

    expect(migratorState.down).toHaveBeenCalledTimes(1)
  })

  it('shows error when creating migration without name', async () => {
    mockConnectedPostgres()
    process.argv[3] = ''

    await main('new')

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Please provide a name for the migration')
    )
  })

  it('creates migration file and folder when folder is missing', async () => {
    mockConnectedPostgres()
    process.argv[3] = 'create_users'
    existsSyncMock.mockReturnValue(false)

    await main('new')

    expect(mkdirSyncMock).toHaveBeenCalledTimes(1)
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1)
    expect(String(writeFileSyncMock.mock.calls[0][0])).toContain('-create_users.ts')
    expect(String(writeFileSyncMock.mock.calls[0][1])).toContain('export function up')
    expect(logger.info).toHaveBeenCalledWith('Created migration:', expect.any(String))
  })

  it('creates migration file without creating folder when folder exists', async () => {
    mockConnectedPostgres()
    process.argv[3] = 'create_posts'
    existsSyncMock.mockReturnValue(true)

    await main('new')

    expect(mkdirSyncMock).not.toHaveBeenCalled()
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1)
  })

  it('logs unknown operation', async () => {
    mockConnectedPostgres()

    await main('unknown')

    expect(logger.error).toHaveBeenCalledWith('Unknown operation:', 'unknown')
  })
})
