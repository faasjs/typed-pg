import type { Client } from "../client"
import { TableBuilder } from "./table-builder"

export class SchemaBuilder {
  private client: Client
  private tables: Map<string, TableBuilder> = new Map()

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

  dropTable(tableName: string) {
    this.tables.delete(tableName)
    return this
  }

  toSQL(): string[] {
    const statements: string[] = []
    for (const builder of this.tables.values()) {
      statements.push(builder.toSQL())
    }
    return statements
  }

  async run() {
    for (const statement of this.toSQL()) {
      await this.client.raw(statement)
    }
    this.tables.clear()
  }
}
