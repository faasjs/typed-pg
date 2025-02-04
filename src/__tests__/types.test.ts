import { describe, it, expectTypeOf } from 'vitest'
import type { ColumnName, ColumnValue, TableName, Tables, TableType } from '../types'

// biome-ignore lint/suspicious/noExportsInTest: <explanation>
export type User = {
  id: number
  name: string
  metadata: {
    age: number
    gender: string
  }
}

declare module '../types' {
  interface Tables {
    query: User
    mutation: User
  }
}

describe('types', () => {
  it('Tables', () => {
    expectTypeOf<Tables>().toEqualTypeOf<{
      query: User
      mutation: User
    }>()
  })

  it('TableType', () => {
    expectTypeOf<TableType<'query'>>().toEqualTypeOf<User>()
    expectTypeOf<TableType>().toEqualTypeOf<Record<string, any>>()
  })

  it('TableName', () => {
    expectTypeOf<TableName>().toEqualTypeOf<'query' | 'mutation'>()
  })

  it('ColumnName', () => {
    expectTypeOf<ColumnName<'query'>>().toEqualTypeOf<'id' | 'name' | 'metadata'>()
    expectTypeOf<ColumnName>().toEqualTypeOf<string>()
  })

  it('ColumnValue', () => {
    expectTypeOf<ColumnValue<'query', 'id'>>().toEqualTypeOf<number>()
    expectTypeOf<ColumnValue<'query', 'name'>>().toEqualTypeOf<string>()
    expectTypeOf<ColumnValue<'query', 'metadata'>>().toEqualTypeOf<{ age: number, gender: string }>()
    expectTypeOf<ColumnValue<'query'>>().toEqualTypeOf<any>()
    expectTypeOf<ColumnValue>().toEqualTypeOf<any>()
  })
})
