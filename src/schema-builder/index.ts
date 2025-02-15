import type { Client } from "../client"
import { createTemplateStringsArray, escapeIdentifier } from "../utils"
import { TableBuilder } from "./table-builder"

export class SchemaBuilder {
  private client: Client
  private tables: Map<string, TableBuilder> = new Map()
  private raws: string[] = []

  constructor(client: Client) {
    this.client = client
  }

  createTable(tableName: string, callback: (table: TableBuilder) => void) {
    const builder = new TableBuilder(tableName, 'create')
    callback(builder)
    this.tables.set(tableName, builder)
    return this
  }

  alterTable(tableName: string, callback: (table: TableBuilder) => void) {
    const builder = this.tables.get(tableName) || new TableBuilder(tableName, 'alter')
    callback(builder)
    this.tables.set(tableName, builder)
    return this
  }

  renameTable(oldTableName: string, newTableName: string) {
    this.raws.push(`alter table ${escapeIdentifier(oldTableName)} rename to ${escapeIdentifier(newTableName)};`)
    return this
  }

  dropTable(tableName: string) {
    this.raws.push(`drop table ${escapeIdentifier(tableName)};`)
    return this
  }

  toSQL(): string[] {
    const statements: string[] = []

    for (const builder of this.tables.values())
      statements.push(...builder.toSQL())

    if (this.raws.length)
      statements.push(...this.raws)

    return statements
  }

  async run() {
    const statements = this.toSQL()

    if (!statements.length) return

    await this.client.postgres.begin(async trx => await trx.call(trx, createTemplateStringsArray(statements.join("\n"))).simple())

    this.tables.clear()
  }
}
