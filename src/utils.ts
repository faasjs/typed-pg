export function escapeIdentifier(identifier: string): string {
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
    return `'${value.replace(/'/g, "''")}'`
  }

  if (Array.isArray(value)) {
    return `ARRAY[${value.map(escapeValue).join(',')}]`
  }

  throw Error(`Unsupported value type: ${value}`)
}

export function createTemplateStringsArray(str: string): TemplateStringsArray {
  const arr = [str]

  Object.defineProperty(arr, "raw", {
    value: Object.freeze([str])
  })

  return Object.freeze(arr) as TemplateStringsArray
}
