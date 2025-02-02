import { describe, it, expect } from 'vitest'
import { escapeIdentifier, escapeValue } from '../utils'

describe('escapeIdentifier', () => {
  it('escapes double quotes', () => {
    expect(escapeIdentifier('foo"bar')).toBe('"foo""bar"')
  })

  it('escapes dots', () => {
    expect(escapeIdentifier('foo.bar')).toBe('"foo"."bar"')
  })

  it('escapes both', () => {
    expect(escapeIdentifier('foo.bar"baz')).toBe('"foo"."bar""baz"')
  })

  it('does not escape regular characters', () => {
    expect(escapeIdentifier('"foobar"')).toBe('"foobar"')
  })

  it('does not escape asterisk', () => {
    expect(escapeIdentifier('*')).toBe('*')
    expect(escapeIdentifier('users.*')).toBe('"users".*')
  })

  it('does not escape COUNT(*)', () => {
    expect(escapeIdentifier('COUNT(*)')).toBe('COUNT(*)')
  })

  it('throws error for non-string values', () => {
    expect(() => escapeIdentifier(42 as any)).toThrowError('Identifier must be a string: 42')
  })
})

describe('escapeValue', () => {
  it('handles null value', () => {
    expect(escapeValue(null)).toBe('NULL')
  })

  it('handles boolean values', () => {
    expect(escapeValue(true)).toBe('TRUE')
    expect(escapeValue(false)).toBe('FALSE')
  })

  it('handles number values', () => {
    expect(escapeValue(42)).toBe('42')
    expect(escapeValue(0)).toBe('0')
    expect(escapeValue(-123.45)).toBe('-123.45')
  })

  it('handles string values', () => {
    expect(escapeValue('hello')).toBe('\'hello\'')
    expect(escapeValue('it\'s')).toBe('\'it\'\'s\'')
    expect(escapeValue('')).toBe('\'\'')
  })

  it('handles array values', () => {
    expect(escapeValue([])).toBe('ARRAY[]')
    expect(escapeValue([1, 2, 3])).toBe('ARRAY[1,2,3]')
    expect(escapeValue(['a', 'b'])).toBe('ARRAY[\'a\',\'b\']')
    expect(escapeValue([1, 'a', true])).toBe('ARRAY[1,\'a\',TRUE]')
    expect(escapeValue([[1, 2], ['a']])).toBe('ARRAY[ARRAY[1,2],ARRAY[\'a\']]')
  })

  it('throws error for unsupported types', () => {
    expect(() => escapeValue({})).toThrowError('Unsupported value type: [object Object]')
    expect(() => escapeValue(undefined)).toThrowError('Unsupported value type: undefined')
  })
})
