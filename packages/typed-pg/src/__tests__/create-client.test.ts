import { beforeEach, describe, expect, it, vi } from 'vitest'

type PostgresFactory = (...args: any[]) => unknown
type SqlMock = (...args: any[]) => Promise<unknown[]>

const postgresMock = vi.hoisted(() => vi.fn<PostgresFactory>())

vi.mock('postgres', () => ({
  default: postgresMock,
}))

describe('createClient', () => {
  beforeEach(() => {
    postgresMock.mockReset()
  })

  it('forwards a connection string and options to postgres', async () => {
    const sql = vi.fn<SqlMock>() as any
    const options = { max: 1, ssl: false }

    postgresMock.mockReturnValue(sql)

    const { createClient } = await import('../client')
    const client = createClient('postgres://typed-pg.test/example', options)

    expect(postgresMock).toHaveBeenCalledWith('postgres://typed-pg.test/example', options)
    expect(client.postgres).toBe(sql)
  })

  it('forwards a connection string without options to postgres', async () => {
    const sql = vi.fn<SqlMock>() as any

    postgresMock.mockReturnValue(sql)

    const { createClient } = await import('../client')
    const client = createClient('postgres://typed-pg.test/example')

    expect(postgresMock).toHaveBeenCalledWith('postgres://typed-pg.test/example', undefined)
    expect(client.postgres).toBe(sql)
  })
})
