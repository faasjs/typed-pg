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
   * @template ColumnNames - An array of column names or JSON select fields.
   * @param {...ColumnNames} columns - The columns to select.
   * @returns {QueryBuilder<T, InferTResult<T, ColumnNames>>} The query builder instance with the selected columns.
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
        column,
        operator: '=',
        value: operatorOrValue,
      })

      return this
    }

    if (!Operators.includes(operatorOrValue))
      throw new Error(`Invalid operator: ${operatorOrValue}`)

    this.whereConditions.push({
      column,
      operator: operatorOrValue,
      value,
    })

    return this
  }

  limit(value: number) {
    this.limitValue = value
    return this
  }

  offset(value: number) {
    this.offsetValue = value
    return this
  }

  orderBy<C extends ColumnName<T>>(
    column: C,
    direction: QueryOrderDirection = 'ASC'
  ) {
    if (!QueryOrderDirections.includes(direction))
      throw Error(`Invalid order direction: ${direction}`)

    this.orderByColumns.push({ column, direction })

    return this
  }

  private buildWhereSql() {
    const sql = []
    const params: any[] = []

    if (this.whereConditions.length > 0) {
      sql.push(
        'WHERE',
        this.whereConditions
          .map(({ column, operator, value }) => {
            if (operator === 'IS NULL' || operator === 'IS NOT NULL')
              return `${escapeIdentifier(column)} ${operator}`

            if (operator === 'IN' || operator === 'NOT IN') {
              params.push(value)
              return `${escapeIdentifier(column)} ${operator} (${value.map(() => '?').join(',')})`
            }

            params.push(value)
            return `${escapeIdentifier(column)} ${operator} ?`
          })
          .join(' AND ')
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

  async pluck<C extends ColumnName<T>>(
    column: C
  ): Promise<ColumnValue<T, C>[]> {
    this.selectColumns = [column]

    const { sql, params } = this.toSql()
    const result = await this.client.raw(sql, ...params)

    return result.map((row: any) => row[column])
  }

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
    const { sql: whereSql, params: whereParams } = this.buildWhereSql()

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

  async delete() {
    const sql = ['DELETE FROM', escapeIdentifier(this.table)]

    // Add where conditions
    const { sql: whereSql, params: whereParams } = this.buildWhereSql()

    if (!whereSql) throw new Error('Missing where conditions')

    sql.push(whereSql)

    return this.client.raw(sql.join(' '), ...whereParams)
  }
}
