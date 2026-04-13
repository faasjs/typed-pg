import { describe, expect, expectTypeOf, it } from 'vitest'

import { TypedPgVitestPlugin } from '../plugin'
import {
  requireTypedPgVitestDatabaseUrl,
  resolveTypedPgVitestDatabaseUrl,
  resolveTypedPgVitestWorkerId,
} from '../plugin-context'

describe('TypedPgVitestPlugin', () => {
  it('only exposes a no-argument plugin factory', () => {
    expectTypeOf(TypedPgVitestPlugin).parameters.toEqualTypeOf<[]>()
  })

  it('injects its Vitest setup files', () => {
    const plugin = TypedPgVitestPlugin()
    const project = {
      config: {
        fileParallelism: true,
        globalSetup: ['custom-global-setup.ts'],
        provide: {},
        setupFiles: ['custom-setup.ts'],
      },
    }

    plugin.configureVitest?.({
      experimental_defineCacheKeyGenerator() {},
      injectTestProjects: async () => [],
      project: project as never,
      vitest: {} as never,
    })

    expect(project.config.fileParallelism).toBe(true)
    expect(project.config.globalSetup[0]).toMatch(/typed-pg-vitest-global-setup\.ts$/)
    expect(project.config.globalSetup[1]).toBe('custom-global-setup.ts')
    expect(project.config.setupFiles[0]).toMatch(/typed-pg-vitest-setup\.ts$/)
    expect(project.config.setupFiles[1]).toBe('custom-setup.ts')
    expect(project.config.provide).toEqual({})
  })

  it('prefers the Vitest pool id when resolving a worker id', () => {
    expect(
      resolveTypedPgVitestWorkerId({
        VITEST_POOL_ID: '2',
        VITEST_WORKER_ID: '7',
      }),
    ).toBe('2')
  })

  it('falls back to the first worker database when the current worker id is missing', () => {
    expect(
      resolveTypedPgVitestDatabaseUrl(
        {
          '1': 'postgresql://worker-1',
          '2': 'postgresql://worker-2',
        },
        '999',
      ),
    ).toBe('postgresql://worker-1')
  })

  it('throws a helpful error when no worker database url is available', () => {
    expect(() => requireTypedPgVitestDatabaseUrl(undefined, '3')).toThrow(/worker 3/)
  })
})
