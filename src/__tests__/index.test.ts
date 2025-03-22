import { describe, expect, it } from 'vitest'
import * as TypedPg from '../index'

describe('TypedPg', () => {
  it('should be defined', () => {
    expect(Object.keys(TypedPg)).toEqual([
      'Migrator',
      'Client',
      'createClient',
      'SchemaBuilder',
      'escapeIdentifier',
      'escapeValue',
      'rawSql',
      'isTemplateStringsArray',
      'createTemplateStringsArray',
    ])
  })
})
