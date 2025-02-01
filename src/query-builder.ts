import type { Client } from './client'
import type { ColumnName, ColumnValue, TableName, TableType } from './types'
import { escapeIdentifier } from './escape'

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

const QueryOrderDirections = ['ASC', 'DESC'] as const

type QueryOrderDirection = (typeof QueryOrderDirections)[number]

export class QueryBuilder<T extends TableName | string = string> {
  private client: Client
  private table: T
  private selectColumns: ColumnName<T>[] = []
  private whereConditions: {
    column: ColumnName<T> | string
    operator: Operator
    value: any
  }[] = []
  private limitValue?: number
  private offsetValue?: number
  private orderByColumns: ColumnName<T>[] = []

  constructor(client: Client, table: T) {
    this.client = client
    this.table = table
  }

  select(...columns: ColumnName<T>[]) {
    if (columns?.length > 0) this.selectColumns = columns

    return this
  }

  where<C extends ColumnName<T>>(column: C, operator: typeof NormalOperators[number], value?: ColumnValue<T, C>): QueryBuilder<T>
  where<C extends ColumnName<T>>(column: C, operator: typeof ArrayOperators[number], value: ColumnValue<T, C>[]): QueryBuilder<T>
  where<C extends ColumnName<T>>(column: C, operator: typeof NullOperators[number]): QueryBuilder<T>
  where<C extends ColumnName<T>>(column: C, operator: typeof JsonOperators[number], value: ColumnValue<T, C>): QueryBuilder<T>
  where<C extends ColumnName<T>>(column: C, value: ColumnValue<T, C>): QueryBuilder<T>
  where(column: ColumnName<T>, operatorOrValue: Operator | any, value?: any) {
    if (typeof value === 'undefined' && !['IS NULL', 'IS NOT NULL'].includes(operatorOrValue)) {
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

  orderBy<C extends ColumnName<T>>(column: C, direction: QueryOrderDirection = 'ASC') {
    if (!QueryOrderDirections.includes(direction))
      throw Error(`Invalid order direction: ${direction}`)

    this.orderByColumns.push(`${column} ${direction}` as any)

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
    sql.push(this.selectColumns.map(escapeIdentifier).join(',') || '*')

    // Add table
    sql.push('FROM', escapeIdentifier(this.table))

    // Add where conditions
    const { sql: whereSql, params: whereParams } = this.buildWhereSql()
    sql.push(whereSql)
    params.push(...whereParams)

    // Add limit and offset
    if (this.limitValue) {
      sql.push('LIMIT ?')
      params.push(this.limitValue)
    }

    if (this.offsetValue) {
      sql.push('OFFSET ?')
      params.push(this.offsetValue)
    }

    // Add order by
    if (this.orderByColumns.length > 0)
      sql.push('ORDER BY', this.orderByColumns.join(','))


    return {
      sql: sql.join(' '),
      params,
    }
  }

  async all() {
    const { sql, params } = this.toSql()
    return this.client.raw(sql, params)
  }

  async first() {
    this.limitValue = 1

    const { sql, params } = this.toSql()

    return this.client.raw(sql, params).then((rows) => rows[0])
  }

  async count() {
    this.selectColumns = ['COUNT(*)' as any]

    const { sql, params } = this.toSql()
    const result = await this.client.raw(sql, params)

    return Number.parseInt(result[0].count, 10)
  }

  async pluck<C extends ColumnName<T>>(column: C): Promise<ColumnValue<T, C>[]> {
    this.selectColumns = [column]

    const { sql, params } = this.toSql()
    const result = await this.client.raw(sql, params)

    return result.map((row: any) => row[column])
  }

  async insert(values: Partial<TableType<T>>, options: { returning?: ColumnName<T>[] | ['*'] } = {}) {
    const sql = [
      'INSERT INTO',
      escapeIdentifier(this.table),
      '(',
      Object.keys(values).map(escapeIdentifier).join(','),
      ') VALUES (',
      Object.values(values).map(() => '?').join(','),
      ')',
    ]

    if (options.returning?.length)
      sql.push('RETURNING', options.returning.map(escapeIdentifier).join(','))

    return this.client.raw(sql.join(' '), Object.values(values))
  }

  async update(values: Partial<TableType<T>>, options: { returning?: ColumnName<T>[] | ['*'] } = {}) {
    const params: any[] = Object.values(values)

    const sql = [
      'UPDATE',
      escapeIdentifier(this.table),
      'SET',
      Object.entries(values)
        .map(([column]) => `${escapeIdentifier(column)} = ?`)
        .join(','),
    ]

    // Add where conditions
    const { sql: whereSql, params: whereParams } = this.buildWhereSql()

    if (!whereSql) throw new Error('Missing where conditions')

    sql.push(whereSql)
    params.push(...whereParams)

    if (options.returning?.length)
      sql.push('RETURNING', options.returning.map(escapeIdentifier).join(','))

    return this.client.raw(sql.join(' '), params)
  }

  async delete() {
    const sql = [
      'DELETE FROM',
      escapeIdentifier(this.table),
    ]

    // Add where conditions
    const { sql: whereSql, params: whereParams } = this.buildWhereSql()

    if (!whereSql) throw new Error('Missing where conditions')

    sql.push(whereSql)

    return this.client.raw(sql.join(' '), whereParams)
  }
}
