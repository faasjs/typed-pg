import type { Sql } from 'postgres'
import type { TableName } from './types'
import { QueryBuilder } from './query-builder'

function isTemplateStringsArray(value: any): value is TemplateStringsArray {
  return Array.isArray(value) && typeof value[0] === 'string' && 'raw' in value
}

export class Client {
  readonly postgres: Sql

  constructor(private sql: Sql) {
    this.postgres = sql
  }

  query<T extends TableName>(table: T) {
    return new QueryBuilder<T>(this, table)
  }

  async transaction<T>(fn: (client: Client) => Promise<T>) {
    return this.postgres.begin(async (sql) => {
      const client = new Client(sql)
      return fn(client)
    })
  }

  async raw<T extends Record<string, any> = any>(
    query: string | TemplateStringsArray,
    ...params: any[]
  ): Promise<T[]> {
    if (isTemplateStringsArray(query)) {
      return this.postgres.call(
        this.postgres,
        query,
        ...params
      ) as unknown as Promise<T[]>
    }

    const paramsArray =
      params.length === 1 && Array.isArray(params[0]) ? params[0] : params

    let paramIndex = 0
    const text = (query as string).replace(/\?/g, () => `$${++paramIndex}`)

    return this.postgres.unsafe(text, paramsArray) as Promise<T[]>
  }

  async quit() {
    return this.postgres.end()
  }
}

export function createClient(sql: Sql): Client {
  return new Client(sql)
}
