import postgres from 'postgres'

export const DATABASE_URL = process.env.DATABASE_URL as string || 'postgresql://development@pg/development'

export function createTestingPostgres() {
  return postgres(DATABASE_URL)
}
