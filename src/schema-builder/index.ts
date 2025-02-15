import type { Client } from "../client"
import { createTemplateStringsArray, escapeIdentifier } from "../utils"
import { TableBuilder } from "./table-builder"

export class SchemaBuilder {
  private client: Client
  private changes: (string | TableBuilder)[] = []

  constructor(client: Client) {
    this.client = client
  }

  createTable(tableName: string, callback: (table: TableBuilder) => void) {
    const builder = new TableBuilder(tableName, 'create')
    callback(builder)
    this.changes.push(builder)
    return this
  }

  alterTable(tableName: string, callback: (table: TableBuilder) => void) {
    const builder = new TableBuilder(tableName, 'alter')
    callback(builder)
    this.changes.push(builder)
    return this
  }

  renameTable(oldTableName: string, newTableName: string) {
    this.changes.push(`alter table ${escapeIdentifier(oldTableName)} rename to ${escapeIdentifier(newTableName)};`)
    return this
  }

  dropTable(tableName: string) {
    this.changes.push(`drop table ${escapeIdentifier(tableName)};`)
    return this
  }

  toSQL(): string[] {
    const statements: string[] = []

    for (const builder of this.changes) {
      if (typeof builder === 'string') {
        statements.push(builder)
      } else {
        statements.push(...builder.toSQL())
      }
    }

    return statements
  }

  async run() {
    const statements = this.toSQL()

    if (!statements.length) return

    await this.client.postgres.begin(async trx => await trx.call(trx, createTemplateStringsArray(statements.join("\n"))).simple())

    this.changes = []
  }
}
