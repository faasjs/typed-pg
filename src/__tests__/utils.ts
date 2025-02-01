import postgres from 'postgres'

export function createTestingPostgres() {
  return postgres(process.env.PG_CONNECTION || 'postgresql://development@pg/development')
}
