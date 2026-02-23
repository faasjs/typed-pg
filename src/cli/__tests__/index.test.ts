import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('cli/index', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('invokes main and exits with code 0', async () => {
    const main = vi.fn(async () => undefined)
    vi.doMock('../main', () => ({ main }))

    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as any)

    await import('../index')
    await Promise.resolve()

    expect(main).toHaveBeenCalledTimes(1)
    expect(exitSpy).toHaveBeenCalledWith(0)
  })
})
