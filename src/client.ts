import type { Sql } from 'postgres'
import type { TableName } from './types'
import { QueryBuilder } from './query-builder'
import { createTemplateStringsArray } from './utils'
import { type Level, Logger } from '@faasjs/logger'
import { randomUUID } from 'node:crypto'

export type ClientOptions = {
  logger?:
  | false
  | {
    label?: string
    level?: Level
  }
}

export class Client {
  readonly postgres: Sql
  readonly options: ClientOptions
  readonly logger?: Logger

  constructor(
    private sql: Sql,
    options: ClientOptions = {}
  ) {
    this.postgres = sql
    this.options = options
    if (options.logger !== false) {
      this.logger = new Logger(options.logger?.label || 'typed-pg')

      if (options.logger?.level) this.logger.level = options.logger.level
    }
  }

  /**
   * Initiates a query builder for the specified table.
   *
   * @template T - The type of the table name.
   * @param {T} table - The name of the table to query.
   * @returns {QueryBuilder<T>} A new instance of the QueryBuilder for the specified table.
   *
   * @example
   * ```ts
   * const users = await client.query('users').select('*').where({ id: userId })
   * ```
   */
  query<T extends TableName>(table: T) {
    return new QueryBuilder<T>(this, table)
  }

  /**
   * Executes a function within a database transaction.
   *
   * @template T - The type of the result returned by the transaction function.
   * @param {function(Client): Promise<T>} fn - A function that takes a `Client` instance and returns a promise.
   * @returns {Promise<T>} - A promise that resolves to the result of the transaction function.
   *
   * @example
   * ```ts
   * const result = await client.transaction(async (trx) => {
   *   return await trx.query('users').insert({ name: 'Alice' })
   * })
   * ```
   */
  async transaction<T>(fn: (client: Client) => Promise<T>) {
    return this.postgres.begin(async sql => {
      const client = new Client(sql as any)
      return fn(client)
    })
  }

  /**
   * Executes a raw SQL query and returns the result as an array of objects.
   *
   * @template T - The type of the result objects. Defaults to `Record<string, any>`.
   * @param {string | TemplateStringsArray} query - The SQL query to execute. Can be a string or a template string array.
   * @param {...any[]} params - The parameters to pass to the SQL query.
   * @returns {Promise<T[]>} A promise that resolves to an array of objects of type `T`.
   *
   * @example
   * ```ts
   * // using a template string array
   * const users = await client.raw<User[]>`SELECT * FROM users`
   * // using a string
   * const users = await client.raw<User[]>('SELECT * FROM users')
   * // template string array with parameters
   * const users = await client.raw<User[]>`SELECT * FROM users WHERE id = ${userId}`
   * // string with parameters
   * const users = await client.raw<User[]>('SELECT * FROM users WHERE id = $1', userId)
   * ```
   */
  async raw<T extends Record<string, any> = any>(
    query: string | TemplateStringsArray,
    ...params: any[]
  ): Promise<T[]> {
    const templateStringsArray = createTemplateStringsArray(query)

    if (!this.logger || this.logger.level !== 'debug')
      return this.postgres<T[]>(templateStringsArray, ...params)

    const id = randomUUID()
    this.logger.time(id)
    try {
      const result = await this.postgres<T[]>(templateStringsArray, ...params)
      this.logger.timeEnd(id, '%s %j', templateStringsArray.raw.join('?'), params)
      return result
    } catch (error: any) {
      this.logger.timeEnd(id, '%s %j', templateStringsArray.raw.join('?'), params)
      this.logger.error(error)
      throw error
    }
  }

  async quit() {
    return this.postgres.end()
  }
}

/**
 * Creates a new instance of the `Client` class using the provided SQL configuration.
 *
 * @param sql - The SQL configuration object used to initialize the client.
 * @returns A new `Client` instance.
 *
 * @example
 * ```ts
 * import { createClient } from 'typed-pg'
 * import postgres from 'postgres'
 *
 * const sql = postgres('postgres://user:pass@localhost:5432/db')
 *
 * const client = createClient(sql)
 * ```
 */
export function createClient(sql: Sql): Client {
  return new Client(sql)
}
