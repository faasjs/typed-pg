import { escapeIdentifier } from "../utils"

type ColumnType = 'smallint'
  | 'integer'
  | 'bigint'
  | 'decimal'
  | 'numeric'
  | 'real'
  | 'double precision'
  | `decimal(${number},${number})`
  | `numeric(${number},${number})`

  | 'varchar'
  | 'char'
  | 'text'
  | `varchar(${number})`
  | `char(${number})`

  | 'boolean'

  | 'date'
  | 'time'
  | 'timestamp'
  | 'timestamptz'
  | 'interval'

  | 'json'
  | 'jsonb'

  | 'uuid'

  | 'bytea'

  | 'inet'
  | 'cidr'
  | 'macaddr'

  | 'point'
  | 'line'
  | 'box'
  | 'circle'

type ColumnDefinition = {
  type: ColumnType
  nullable?: boolean
  defaultValue?: string | number | boolean | null
  primary?: boolean
  unique?: boolean
  check?: string
  references?: {
    table: string
    column: string
    onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION'
    onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION'
  }
  collate?: string
}

type AlterOperation =
  | { type: 'renameColumn'; from: string; to: string }
  | { type: 'dropColumn'; name: string }
  | { type: 'alterColumn'; name: string; changes: Partial<ColumnDefinition> };

export type TableBuilderMode = 'create' | 'alter'

export class TableBuilder {
  private tableName: string
  private mode: TableBuilderMode
  private columns: Map<string, ColumnDefinition> = new Map()
  private indices: Map<string, string[]> = new Map()
  private operations: AlterOperation[] = [];

  constructor(tableName: string, mode: TableBuilderMode) {
    this.tableName = tableName
    this.mode = mode
  }

  specificType(name: string, type: string) {
    return this.column(name, type as ColumnType)
  }

  string(name: string, length?: number) {
    return this.column(name, length ? `varchar(${length})` : 'varchar')
  }

  number(name: string, precision?: number, scale?: number) {
    return this.column(
      name,
      precision ? `decimal(${precision},${scale || 0})` : 'integer'
    )
  }

  boolean(name: string) {
    return this.column(name, 'boolean')
  }

  date(name: string) {
    return this.column(name, 'date')
  }

  json(name: string) {
    return this.column(name, 'json')
  }

  jsonb(name: string) {
    return this.column(name, 'jsonb')
  }

  timestamp(name: string) {
    return this.column(name, 'timestamp')
  }

  timestamptz(name: string) {
    return this.column(name, 'timestamptz')
  }

  timestamps() {
    this.timestamptz('created_at').defaultTo('now()')
    this.timestamptz('updated_at').defaultTo('now()')

    return this
  }

  private column(name: string, type: ColumnType) {
    const column: ColumnDefinition = { type }
    this.columns.set(name, column)
    return new ColumnBuilder(column)
  }

  renameColumn(from: string, to: string) {
    const column = this.columns.get(from)

    if (!column) {
      if (this.mode === 'create')
        throw Error(`renameColumn failed: Column "${from}" does not exist`)

      this.operations.push({
        type: 'renameColumn',
        from,
        to
      });

      return this
    }

    this.columns.delete(from)
    this.columns.set(to, column)

    return this
  }

  dropColumn(name: string) {
    this.columns.delete(name)

    if (this.mode === 'create')
      return this

    this.operations.push({
      type: 'dropColumn',
      name
    });

    return this
  }

  alterColumn(name: string, changes: Partial<ColumnDefinition>) {
    const column = this.columns.get(name)

    if (!column) {
      if (this.mode === 'create')
        throw Error(`alterColumn failed: Column "${name}" does not exist`)

      this.operations.push({
        type: 'alterColumn',
        name,
        changes
      });

      return this
    }

    this.columns.set(name, { ...column, ...changes })

    return this
  }

  index(columns: string | string[], indexName?: string) {
    const name = indexName || `idx_${this.tableName}_${columns}`
    this.indices.set(name, Array.isArray(columns) ? columns : [columns])
    return this
  }

  toSQL(): string[] {
    const sql: string[] = []
    const columnDefs = Array.from(this.columns.entries())
      .map(([name, def]) => this.columnToSQL(name, def))

    switch (this.mode) {
      case 'create':
        sql.push(`CREATE TABLE ${escapeIdentifier(this.tableName)} (\n${columnDefs.join(',\n')}\n);\n`)
        break
      case 'alter':
        sql.push(...columnDefs.map(c => `ALTER TABLE ${escapeIdentifier(this.tableName)} ADD COLUMN ${c};`))

        for (const operation of this.operations) {
          switch (operation.type) {
            case 'renameColumn':
              sql.push(
                `ALTER TABLE ${escapeIdentifier(this.tableName)} ` +
                `RENAME COLUMN ${escapeIdentifier(operation.from)} TO ${escapeIdentifier(operation.to)};\n`
              )
              break
            case 'dropColumn':
              sql.push(
                `ALTER TABLE ${escapeIdentifier(this.tableName)} ` +
                `DROP COLUMN "${operation.name}";\n`
              )
              break
            case 'alterColumn':
              sql.push(
                ...Object.entries(operation.changes)
                  .map(([key, value]) => `ALTER TABLE ${escapeIdentifier(this.tableName)} ${this.alterToSql(operation.name, key as keyof ColumnDefinition, value)};`)
              )
              break
          }
        }
        break
    }

    const indexDefs = Array.from(this.indices.entries())
      .map(([name, columns]) => this.indexToSQL(name, columns))

    sql.push(indexDefs.join('\n'))

    // console.log(sql.join('\n'))

    return sql
  }

  private columnToSQL(name: string, def: ColumnDefinition): string {
    const parts = [
      escapeIdentifier(name),
      def.type,
      def.nullable ? 'NULL' : 'NOT NULL',
      def.defaultValue !== undefined ? `DEFAULT ${def.defaultValue}` : '',
      def.primary ? 'PRIMARY KEY' : '',
      def.unique ? 'UNIQUE' : '',
      def.references ?
        `REFERENCES ${def.references.table}(${def.references.column})` : '',
    ].filter(Boolean)

    return parts.join(' ')
  }

  private indexToSQL(name: string, columns: string[]): string {
    return `CREATE INDEX ${escapeIdentifier(name)} ON ${escapeIdentifier(this.tableName)} (${columns.map(escapeIdentifier).join(', ')});`
  }

  private alterToSql(columnName: string, type: keyof ColumnDefinition, value: any) {
    switch (type) {
      case 'type':
        return `ALTER COLUMN ${escapeIdentifier(columnName)} SET DATA TYPE ${value};`
      case 'nullable':
        return `ALTER COLUMN ${escapeIdentifier(columnName)} ${value ? 'DROP' : 'SET'} NOT NULL;`
      case 'defaultValue':
        return `ALTER COLUMN ${escapeIdentifier(columnName)} SET DEFAULT ${value};`
      case 'primary':
        return value ? `ADD PRIMARY KEY (${escapeIdentifier(columnName)})` : `DROP CONSTRAINT IF EXISTS ${escapeIdentifier(`${this.tableName}_pkey`)};`
      case 'unique':
        return value ? `ADD UNIQUE (${escapeIdentifier(columnName)})` : `DROP CONSTRAINT IF EXISTS ${escapeIdentifier(`${this.tableName}_${columnName}_unique`)};`
      case 'check':
        return `ADD CHECK (${value});`
      case 'references':
        return `ALTER COLUMN ${escapeIdentifier(columnName)} ADD REFERENCES ${value.table}(${value.column});`
      case 'collate':
        return `ALTER COLUMN ${escapeIdentifier(columnName)} SET COLLATE ${value};`
    }
  }
}

class ColumnBuilder {
  constructor(private definition: ColumnDefinition) { }

  nullable(isNullable = true) {
    this.definition.nullable = isNullable
    return this
  }

  defaultTo(value: any) {
    this.definition.defaultValue = value
    return this
  }

  primary() {
    this.definition.primary = true
    return this
  }

  unique() {
    this.definition.unique = true
    return this
  }

  references(table: string, column: string) {
    this.definition.references = { table, column }
    return this
  }
}
