import { describe, it, expectTypeOf } from 'vitest'
import type { ColumnName, ColumnValue, TableName, Tables } from '../types'

type User = {
  id: number
  name: string
  metadata: {
    age: number
  }
}

declare module '../types' {
  interface Tables {
    users: User
  }
}

describe('types', () => {
  it('Tables', () => {
    expectTypeOf<Tables>().toEqualTypeOf<{
      users: User
    }>()
  })

  it('TableName', () => {
    expectTypeOf<TableName>().toEqualTypeOf<'users'>()
  })

  it('ColumnName', () => {
    expectTypeOf<ColumnName<'users'>>().toEqualTypeOf<'id' | 'name' | 'metadata'>()
    expectTypeOf<ColumnName>().toEqualTypeOf<string>()
  })

  it('ColumnValue', () => {
    expectTypeOf<ColumnValue<'users', 'id'>>().toEqualTypeOf<number>()
    expectTypeOf<ColumnValue<'users', 'name'>>().toEqualTypeOf<string>()
    expectTypeOf<ColumnValue<'users', 'metadata'>>().toEqualTypeOf<{ age: number }>()
    expectTypeOf<ColumnValue<'users'>>().toEqualTypeOf<any>()
    expectTypeOf<ColumnValue>().toEqualTypeOf<any>()
  })
})
