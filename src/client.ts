import type { Sql } from 'postgres'
import type { TableName } from './types'
import { QueryBuilder } from './query-builder'
import { createTemplateStringsArray } from './utils'

export class Client {
  readonly postgres: Sql

  constructor(private sql: Sql) {
    this.postgres = sql
  }

  query<T extends TableName>(table: T) {
    return new QueryBuilder<T>(this, table)
  }

  async transaction<T>(fn: (client: Client) => Promise<T>) {
    return this.postgres.begin(async sql => {
      const client = new Client(sql)
      return fn(client)
    })
  }

  async raw<T extends Record<string, any> = any>(
    query: string | TemplateStringsArray,
    ...params: any[]
  ): Promise<T[]> {
    const templateStringsArray = createTemplateStringsArray(query)

    return this.postgres<T[]>(templateStringsArray, ...params)
  }

  async quit() {
    return this.postgres.end()
  }
}

export function createClient(sql: Sql): Client {
  return new Client(sql)
}
