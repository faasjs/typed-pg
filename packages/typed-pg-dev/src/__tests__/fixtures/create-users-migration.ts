import type { SchemaBuilder } from 'typed-pg'

export function up(builder: SchemaBuilder) {
  builder.createTable('users', (table) => {
    table.number('id').primary()
    table.string('name')
  })
}

export function down(builder: SchemaBuilder) {
  builder.dropTable('users')
}
