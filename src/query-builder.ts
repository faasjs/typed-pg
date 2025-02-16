import type { Client } from './client'
import type { ColumnName, ColumnValue, TableName, Tables, TableType } from './types'
import { escapeIdentifier } from './utils'

const NormalOperators = ['=', '!=', '<', '<=', '>', '>='] as const
const ArrayOperators = ['IN', 'NOT IN'] as const
const NullOperators = ['IS NULL', 'IS NOT NULL'] as const
const JsonOperators = ['@>'] as const

const Operators = [
  ...NormalOperators,
  ...ArrayOperators,
  ...NullOperators,
  ...JsonOperators,
] as const

type Operator = (typeof Operators)[number]

const QueryOrderDirections = ['ASC', 'DESC', 'asc', 'desc'] as const

type QueryOrderDirection = (typeof QueryOrderDirections)[number]

type IsObject<T> = T extends object ? true : false

type GetTableType<T extends TableName | string> = T extends keyof Tables
  ? Tables[T]
  : never

type JsonbColumns<T extends TableName | string, Table = TableType<T>> = {
  [K in keyof Table]: IsObject<Table[K]> extends true ? K : never
}[keyof Table]

type JsonbFields<
  T extends TableName | string,
  C extends JsonbColumns<T>,
> = keyof GetTableType<T>[C & keyof GetTableType<T>]

type JsonSelectField<T extends TableName | string> = {
  column: JsonbColumns<T>
  fields: JsonbFields<T, JsonbColumns<T>>[]
  alias?: string
}

type InferJsonFields<
  T extends TableName | string,
  C extends JsonbColumns<T>,
  Fields extends JsonbFields<T, C>[]
> = {
    [K in C & keyof GetTableType<T>]: Pick<GetTableType<T>[K], Fields[number]>
  }

type InferColumnType<
  T extends TableName | string,
  C extends ColumnName<T> | JsonSelectField<T>
> = C extends JsonSelectField<T>
  ? InferJsonFields<T, C['column'], C['fields']>
  : C extends keyof GetTableType<T>
  ? { [K in C]: GetTableType<T>[K] }
  : never

type Flatten<T> = { [K in keyof T]: T[K] }

type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

type MergeTypes<T> = T extends any[] ? Flatten<UnionToIntersection<T[number]>> : T

type InferTResult<
  TName extends TableName | string,
  ColumnNames extends (ColumnName<TName> | JsonSelectField<TName>)[] = ColumnName<TName>[],
> = ColumnNames extends ['*']
  ? TableType<TName>
  : MergeTypes<{
    [K in keyof ColumnNames]: InferColumnType<TName, ColumnNames[K]>
  }>

export class QueryBuilder<
  T extends TableName | string = string,
  TResult = InferTResult<T>[],
> {
  private client: Client
  private table: T
  private selectColumns: (ColumnName<T> | JsonSelectField<T>)[] = []
  private whereConditions: {
    type: 'AND' | 'OR'
    column: ColumnName<T> | string
    operator: Operator
    value: any
  }[] = []
  private limitValue?: number
  private offsetValue?: number
  private orderByColumns: {
    column: ColumnName<T> | string
    direction: QueryOrderDirection
  }[] = []

  constructor(client: Client, table: T) {
    this.client = client
    this.table = table
  }

  /**
   * Selects specific columns for the query.
   *
   * @param {...ColumnNames} columns - The columns to select.
   *
   * @example
   * ```ts
   * const users = await db('users').select('id', 'name') // SELECT id, name FROM users
   *
   * const users = await db('users').select('id', { column: 'data', fields: ['email'] }) // SELECT id, jsonb_build_object('email', data->'email') AS data FROM users
   * ```
   */
  select<ColumnNames extends (ColumnName<T> | JsonSelectField<T>)[]>(
    ...columns: ColumnNames
  ): QueryBuilder<T, InferTResult<T, ColumnNames>> {
    if (columns?.length > 0) this.selectColumns = columns

    return this as any
  }

  /**
   * Applies a WHERE condition to the query builder.
   *
   * @param column - The column to filter on.
   * @param operator - The operator to use for comparison.
   * @param value - The value to compare against.
   *
   * @example
   * ```ts
   * await query('users').where('id', 1) // WHERE id = 1
   *
   * await query('users').where('id', '>', 1) // WHERE id > 1
   *
   * await query('users').where('id', 'IN', [1, 2, 3]) // WHERE id IN (1, 2, 3)
   *
   * await query('users').where('data', '@>', { email: 'example@example.com' }) // WHERE data @> '{"email": "example@example.com"}'
   * ```
   */
  where<C extends ColumnName<T>>(
    column: C,
    operator: (typeof NormalOperators)[number],
    value?: ColumnValue<T, C>
  ): QueryBuilder<T, TResult>
  where<C extends ColumnName<T>>(
    column: C,
    operator: (typeof ArrayOperators)[number],
    value: ColumnValue<T, C>[]
  ): QueryBuilder<T, TResult>
  where<C extends ColumnName<T>>(
    column: C,
    operator: (typeof NullOperators)[number]
  ): QueryBuilder<T, TResult>
  where<C extends ColumnName<T>>(
    column: C,
    operator: (typeof JsonOperators)[number],
    value: Partial<ColumnValue<T, C>>
  ): QueryBuilder<T, TResult>
  where<C extends ColumnName<T>>(
    column: C,
    value: ColumnValue<T, C>
  ): QueryBuilder<T, TResult>
  where(column: ColumnName<T>, operatorOrValue: Operator | any, value?: any) {
    if (
      typeof value === 'undefined' &&
      !['IS NULL', 'IS NOT NULL'].includes(operatorOrValue)
    ) {
      this.whereConditions.push({
        type: 'AND',
        column,
        operator: '=',
        value: operatorOrValue,
      })

      return this
    }

    if (!Operators.includes(operatorOrValue))
      throw new Error(`Invalid operator: ${operatorOrValue}`)

    this.whereConditions.push({
      type: 'AND',
      column,
      operator: operatorOrValue,
      value,
    })

    return this
  }

  /**
   * Applies an OR WHERE condition to the query builder.
   * @param column - The column to filter on.
   * @param operator - The operator to use for comparison.
   * @param value - The value to compare against.
   * @example
   * ```ts
   * await query('users').where('id', 1).orWhere('id', 2) // WHERE id = 1 OR id = 2
   * ```
   */
  orWhere<C extends ColumnName<T>>(
    column: C,
    operator: (typeof NormalOperators)[number],
    value?: ColumnValue<T, C>
  ): QueryBuilder<T, TResult>
  orWhere<C extends ColumnName<T>>(
    column: C,
    operator: (typeof ArrayOperators)[number],
    value: ColumnValue<T, C>[]
  ): QueryBuilder<T, TResult>
  orWhere<C extends ColumnName<T>>(
    column: C,
    operator: (typeof NullOperators)[number]
  ): QueryBuilder<T, TResult>
  orWhere<C extends ColumnName<T>>(
    column: C,
    operator: (typeof JsonOperators)[number],
    value: Partial<ColumnValue<T, C>>
  ): QueryBuilder<T, TResult>
  orWhere<C extends ColumnName<T>>(
    column: C,
    value: ColumnValue<T, C>
  ): QueryBuilder<T, TResult>
  orWhere(column: ColumnName<T>, operatorOrValue: Operator | any, value?: any) {
    if (
      typeof value === 'undefined' &&
      !['IS NULL', 'IS NOT NULL'].includes(operatorOrValue)
    ) {
      this.whereConditions.push({
        type: 'OR',
        column,
        operator: '=',
        value: operatorOrValue,
      })

      return this
    }

    if (!Operators.includes(operatorOrValue))
      throw new Error(`Invalid operator: ${operatorOrValue}`)

    this.whereConditions.push({
      type: 'OR',
      column,
      operator: operatorOrValue,
      value,
    })

    return this
  }

  /**
   * Sets the limit value for the query.
   *
   * @param value - The maximum number of records to retrieve.
   *
   * @example
   * ```ts
   * await query('users').limit(10) // LIMIT 10
   * ```
   */
  limit(value: number) {
    this.limitValue = value
    return this
  }

  /**
   * Sets the offset value for the query.
   *
   * @param value - The number of records to skip.
   *
   * @example
   * ```ts
   * await query('users').offset(10) // OFFSET 10
   * ```
   */
  offset(value: number) {
    this.offsetValue = value
    return this
  }

  /**
   * Sets the order by column and direction for the query.
   *
   * @param column - The column to order by.
   * @param direction - The direction to order by.
   *
   * @example
   * ```ts
   * await query('users').orderBy('id', 'DESC') // ORDER BY id DESC
   * ```
   */
  orderBy<C extends ColumnName<T>>(
    column: C,
    direction: QueryOrderDirection = 'ASC'
  ) {
    if (!QueryOrderDirections.includes(direction))
      throw Error(`Invalid order direction: ${direction}`)

    this.orderByColumns.push({ column, direction })

    return this
  }

  private buildWhereSql(mode: 'query' | 'update' = 'query') {
    const sql = []
    const params: any[] = []

    if (this.whereConditions.length > 0) {
      sql.push(
        'WHERE',
        this.whereConditions
          .map(({ type, column, operator, value }, index) => {
            const prefix = index > 0 ? `${type} ` : ''

            if (operator === 'IS NULL' || operator === 'IS NOT NULL')
              return `${prefix}${escapeIdentifier(column)} ${operator}`

            if (operator === 'IN' || operator === 'NOT IN') {
              if (mode === 'update') {
                params.push(value)
                return `${prefix}${escapeIdentifier(column)} = ANY(?)`
              }

              params.push(...value)
              return `${prefix}${escapeIdentifier(column)} ${operator} (${value.map(() => '?').join(',')})`
            }

            params.push(value)
            return `${prefix}${escapeIdentifier(column)} ${operator} ?`
          })
          .join(' ')
      )
    }

    return {
      sql: sql.join(' '),
      params,
    }
  }

  toSql() {
    const sql = ['SELECT']
    const params: any[] = []

    // Add columns
    sql.push(this.selectColumns.map(c => typeof c === 'string' ? escapeIdentifier(c) : `jsonb_build_object(${c.fields.map(f => `'${f as string}', ${escapeIdentifier(c.column as string)}->'${f as string}'`).join(',')}) AS ${escapeIdentifier(c.alias || c.column as string)}`).join(',') || '*')

    // Add table
    sql.push('FROM', escapeIdentifier(this.table))

    // Add where conditions
    const { sql: whereSql, params: whereParams } = this.buildWhereSql()
    sql.push(whereSql)
    params.push(...whereParams)

    // Add order by
    if (this.orderByColumns.length > 0)
      sql.push(
        'ORDER BY',
        this.orderByColumns
          .map(({ column, direction }) => `${escapeIdentifier(column)} ${direction}`)
          .join(',')
      )

    // Add limit and offset
    if (this.limitValue) {
      sql.push('LIMIT ?')
      params.push(this.limitValue)
    }

    if (this.offsetValue) {
      sql.push('OFFSET ?')
      params.push(this.offsetValue)
    }

    return {
      sql: sql.join(' '),
      params,
    }
  }

  // biome-ignore lint/suspicious/noThenProperty: <explanation>
  then<TResult1 = TResult, TResult2 = never>(
    onfulfilled?: ((value: TResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const { sql, params } = this.toSql()

    return this.client.raw(sql, ...params).then(onfulfilled as any, onrejected)
  }

  async first(): Promise<(TResult extends (infer U)[] ? U : TResult) | null> {
    this.limit(1)

    const { sql, params } = this.toSql()

    return this.client.raw(sql, ...params).then(rows => rows[0])
  }

  /**
   * Executes a SQL query to count the number of rows in the specified table.
   *
   * @returns {Promise<number>} A promise that resolves to the count of rows in the table.
   *
   * @example
   * ```ts
   * const count = await db('users').count() // => 2
   * ```
   */
  async count() {
    const sql = ['SELECT COUNT(*) AS count']
    const params: any[] = []

    sql.push('FROM', escapeIdentifier(this.table))

    const { sql: whereSql, params: whereParams } = this.buildWhereSql()
    sql.push(whereSql)
    params.push(...whereParams)

    const result = await this.client.raw(sql.join(' '), ...params)

    return Number.parseInt(result[0].count, 10)
  }

  /**
   * Asynchronously retrieves the values of a specified column from the database.
   *
   * @template C - The type of the column name.
   * @param {C} column - The name of the column to pluck values from.
   * @returns {Promise<ColumnValue<T, C>[]>} A promise that resolves to an array of values from the specified column.
   *
   * @example
   * ```ts
   * const names = await db('users').pluck('name') // => ['Alice', 'Bob']
   * ```
   */
  async pluck<C extends ColumnName<T>>(
    column: C
  ): Promise<ColumnValue<T, C>[]> {
    this.selectColumns = [column]

    const { sql, params } = this.toSql()
    const result = await this.client.raw(sql, ...params)

    return result.map((row: any) => row[column])
  }

  /**
   * Inserts one or more rows into the table.
   *
   * @template FirstValue - The type of the first value to insert, which must be a partial of the table type.
   * @template Returning - The type of the columns to return, which can be an array of keys of the table type or ['*'].
   *
   * @param values - The value or array of values to insert. If an array, the first value is used to determine the columns.
   * @param options - Optional settings for the insert operation.
   * @param options.returning - An array of columns to return, or ['*'] to return all columns.
   *
   * @example
   * ```ts
   * await db('users').insert({ id: 3, name: 'Charlie' }) // => []
   *
   * await db('users').insert({ id: 3, name: 'Charlie' }, { returning: ['name'] }) // => [{ name: 'Charlie' }]
   *
   * await db('users').insert([{ id: 4, name: 'David' }, { id: 5, name: 'Eve' }]) // => []
   * ```
   */
  async insert<FirstValue extends Partial<TableType<T>>, Returning extends (keyof TableType<T>)[] | ['*']>(
    values: FirstValue | [FirstValue, ...{
      [K in Extract<keyof FirstValue, string | ColumnName<T>>]: ColumnValue<T, K>
    }[]],
    options: { returning?: Returning } = {}
  ): Promise<
    Returning extends ['*']
    ? TableType<T>
    : Returning[number] extends keyof TableType<T>
    ? Pick<TableType<T>, Returning[number]>
    : Record<string, any>[]
  > {
    const valuesArray = Array.isArray(values) ? values : [values]

    const sql = [
      'INSERT INTO',
      escapeIdentifier(this.table),
      '(',
      Object.keys(valuesArray[0]).map(escapeIdentifier).join(','),
      ') VALUES',

      valuesArray.map((v) => `(${Object.keys(v).map(() => '?').join(',')})`).join(',')
    ]

    if (options.returning?.length)
      sql.push(
        'RETURNING',
        options.returning
          .map(column => escapeIdentifier(column as string))
          .join(',')
      )

    return this.client.raw(sql.join(' '), ...(valuesArray.map(v => Object.values(v))).flat()) as any
  }

  /**
   * Updates records in the table with the specified values and returns the updated records.
   *
   * @template Returning - An array of keys of the table type or ['*'] to return all columns.
   * @param {Partial<TableType<T>>} values - The values to update in the table.
   * @param {Object} [options] - Optional settings for the update operation.
   * @param {Returning} [options.returning] - An array of columns to return after the update.
   *
   * @example
   * ```ts
   * await db('users').where('id', 1).update({ name: 'Alice' }) // => []
   *
   * await db('users').where('id', 1).update({ name: 'Alice' }, { returning: ['name'] }) // => [{ name: 'Alice' }]
   * ```
   */
  async update<Returning extends (keyof TableType<T>)[] | ['*']>(
    values: Partial<TableType<T>>,
    options: { returning?: Returning } = {}
  ): Promise<
    Returning extends ['*']
    ? TableType<T>
    : Returning[number] extends keyof TableType<T>
    ? Pick<TableType<T>, Returning[number]>
    : Record<string, any>[]
  > {
    const params: any[] = Object.values(values)

    const sql = [
      'UPDATE',
      escapeIdentifier(this.table),
      'SET',
      Object.keys(values)
        .map(column => `${escapeIdentifier(column)} = ?`)
        .join(','),
    ]

    // Add where conditions
    const { sql: whereSql, params: whereParams } = this.buildWhereSql('update')

    if (!whereSql) throw new Error('Missing where conditions')

    sql.push(whereSql)
    params.push(...whereParams)

    if (options.returning?.length)
      sql.push(
        'RETURNING',
        options.returning
          .map(column => escapeIdentifier(column as string))
          .join(',')
      )

    return this.client.raw(sql.join(' '), ...params) as any
  }

  /**
   * Deletes records from the specified table based on the provided where conditions.
   *
   * @throws {Error} If no where conditions are provided.
   * @returns {Promise<any>} The result of the raw SQL execution.
   *
   * @example
   * ```ts
   * await db('users').where('id', 1).delete() // DELETE FROM users WHERE id = 1
   * ```
   */
  async delete() {
    const sql = ['DELETE FROM', escapeIdentifier(this.table)]

    // Add where conditions
    const { sql: whereSql, params: whereParams } = this.buildWhereSql()

    if (!whereSql) throw new Error('Missing where conditions')

    sql.push(whereSql)

    return this.client.raw(sql.join(' '), ...whereParams)
  }

  /**
   * Inserts or updates records in the database table.
   *
   * @template FirstValue - A partial type of the table's row type.
   *
   * @param {FirstValue | [FirstValue, ...{ [K in Extract<keyof FirstValue, string | ColumnName<T>>]: ColumnValue<T, K> }[]]} values - The values to insert or update. Can be a single object or an array of objects.
   * @param {Object} options - The options for the upsert operation.
   * @param {ColumnName<T>[]} options.conflict - The columns to check for conflicts.
   * @param {(keyof FirstValue)[]} [options.update] - The columns to update if a conflict occurs.
   * @param {(keyof FirstValue)[] | ['*']} [options.returning] - The columns to return after the upsert operation.
   *
   * @returns {Promise<any>} - A promise that resolves to the result of the upsert operation.
   *
   * @example
   * ```ts
   * await db('users').upsert({ id: 1, name: 'Alice' }, { conflict: ['id'], update: ['name'] }) // => []
   * ```
   */
  async upsert<FirstValue extends Partial<TableType<T>>>(
    values: FirstValue | [FirstValue, ...{
      [K in Extract<keyof FirstValue, string | ColumnName<T>>]: ColumnValue<T, K>
    }[]],
    options: {
      conflict: ColumnName<T>[]
      update?: (keyof FirstValue)[]
      returning?: (keyof FirstValue)[] | ['*']
    }
  ) {
    const valuesArray = Array.isArray(values) ? values : [values]

    const sql = [
      'INSERT INTO',
      escapeIdentifier(this.table),
      '(',
      Object.keys(valuesArray[0]).map(escapeIdentifier).join(','),
      ') VALUES',

      valuesArray.map((v) => `(${Object.keys(v).map(() => '?').join(',')})`).join(','),

      'ON CONFLICT',
      `(${options.conflict.map(escapeIdentifier).join(',')})`,

      'DO UPDATE SET',
      Object.keys(valuesArray[0])
        .filter(column => !options.conflict.includes(column as ColumnName<T>) && (options.update ? options.update.includes(column as keyof FirstValue) : true))
        .map(column => `${escapeIdentifier(column)} = EXCLUDED.${escapeIdentifier(column)}`)
        .join(','),

      options.returning?.length ?
        `RETURNING ${options.returning.map(c => escapeIdentifier(c as string)).join(',')}` : ''
    ].filter(Boolean)

    return this.client.raw(sql.join(' '), ...(valuesArray.map(v => Object.values(v))).flat()) as any
  }
}
