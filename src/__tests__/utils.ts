import postgres from 'postgres'

export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/template1?sslmode=disable'

export function createTestingPostgres() {
  return postgres(DATABASE_URL, {
    max: 1,
    ssl: false,
  })
}
