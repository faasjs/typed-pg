import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveVitestWorkerCount: vi.fn<() => number>(),
  startPGliteServer: vi.fn<() => Promise<{ databaseUrl: string; stop: () => Promise<void> }>>(),
}))

vi.mock('../../../typed-pg-dev/src/pglite', () => ({
  startPGliteServer: mocks.startPGliteServer,
}))

vi.mock('../../../typed-pg-dev/src/vitest-worker-count', () => ({
  resolveVitestWorkerCount: mocks.resolveVitestWorkerCount,
}))

function createTestingServer(databaseUrl: string) {
  return {
    databaseUrl,
    stop: vi.fn(async () => undefined),
  }
}

describe('typed-pg test global setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mocks.resolveVitestWorkerCount.mockReturnValue(1)
  })

  it('creates one temporary database per resolved worker and tears them down', async () => {
    const workerOneServer = createTestingServer('postgresql://worker-1')
    const workerTwoServer = createTestingServer('postgresql://worker-2')
    const project = {
      config: {},
      provide: vi.fn(),
      vitest: {
        config: {},
      },
    }

    mocks.resolveVitestWorkerCount.mockReturnValueOnce(2)
    mocks.startPGliteServer
      .mockResolvedValueOnce(workerOneServer)
      .mockResolvedValueOnce(workerTwoServer)

    const module = await import('./global-setup')
    const teardown = await module.default(project as never)

    expect(project.provide).toHaveBeenCalledWith('__typedPgVitestDatabaseUrls', {
      '1': workerOneServer.databaseUrl,
      '2': workerTwoServer.databaseUrl,
    })

    await teardown()

    expect(workerOneServer.stop).toHaveBeenCalledTimes(1)
    expect(workerTwoServer.stop).toHaveBeenCalledTimes(1)
  })

  it('stops already started databases when a later worker fails to boot', async () => {
    const workerOneServer = createTestingServer('postgresql://worker-1')
    const project = {
      config: {},
      provide: vi.fn(),
      vitest: {
        config: {},
      },
    }

    mocks.resolveVitestWorkerCount.mockReturnValueOnce(2)
    mocks.startPGliteServer
      .mockResolvedValueOnce(workerOneServer)
      .mockRejectedValueOnce(Error('start failed'))

    const module = await import('./global-setup')

    await expect(module.default(project as never)).rejects.toThrowError('start failed')
    expect(workerOneServer.stop).toHaveBeenCalledTimes(1)
    expect(project.provide).not.toHaveBeenCalled()
  })
})
