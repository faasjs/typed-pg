import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('cli/index', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('invokes main and exposes the returned exit code via process.exitCode', async () => {
    const main = vi.fn<() => Promise<number>>(async () => 1)
    vi.doMock('../main', () => ({ main }))

    const previousExitCode = process.exitCode
    process.exitCode = undefined

    await import('../index')
    await Promise.resolve()

    expect(main).toHaveBeenCalledTimes(1)
    expect(process.exitCode).toBe(1)

    process.exitCode = previousExitCode
  })
})
