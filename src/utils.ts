export type RawSql = string & { __raw: true }

export function escapeIdentifier(identifier: string | RawSql): string {
  if (identifier && typeof identifier === 'object' && '__raw' in identifier && (identifier as RawSql).__raw === true)
    return (identifier as RawSql).toString()

  if (typeof identifier !== 'string')
    throw Error(`Identifier must be a string: ${identifier}`)

  return `"${identifier
    .replace(/"/g, '""')
    .replace(/\./g, '"."')}"`
    .replace(/^["]{1,}/, '"')
    .replace(/["]{1,}$/, '"')
    .replace('"*"', '*')
    .replace(/"COUNT\(\*\)"/i, 'COUNT(*)')
}

export function escapeValue(value: any): string {
  if (value && typeof value === 'object' && '__raw' in value && value.__raw === true) {
    return value.toString();
  }

  if (value === null) {
    return 'NULL'
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  if (typeof value === 'string') {
    if (value === 'now()') return value

    return `'${value.replace(/'/g, "''")}'`
  }

  if (Array.isArray(value)) {
    return `ARRAY[${value.map(escapeValue).join(',')}]`
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`
  }

  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`
  }

  throw Error(`Unsupported value: ${value}`)
}

/**
 * Creates a raw SQL value object.
 *
 * This function is used to mark a string as a raw SQL value, which can be useful
 * when you need to include raw SQL in a query without any escaping or processing.
 *
 * @param value - The raw SQL string.
 * @returns An object representing the raw SQL value with a custom `toString` method.
 */
export function rawSql(value: string): RawSql {
  return Object.assign(
    value,
    {
      __raw: true,
      toString: () => value,
    }
  ) as RawSql
}

export function isTemplateStringsArray(value: any): value is TemplateStringsArray {
  return Array.isArray(value) && typeof value[0] === 'string' && 'raw' in value
}

export function createTemplateStringsArray(str: string | TemplateStringsArray): TemplateStringsArray {
  if (isTemplateStringsArray(str)) return str

  const parts = str.split(/\?/g)

  const arr = [...parts]

  Object.defineProperty(arr, "raw", {
    value: Object.freeze([...parts])
  })

  return Object.freeze(arr) as TemplateStringsArray
}
