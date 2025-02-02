import postgres from "postgres"

export async function main() {
  const connection = process.env.DATABASE_URL as string

  if (!connection)
    throw Error('DATABASE_URL not set, please run `DATABASE_URL=postgres://<your pg url> typed-pg`')

  const sql = postgres(connection)

  try {
    await sql`SELECT 1`
  } catch (error) {
    console.error(error)
    throw Error('Error connecting to database, please check your DATABASE_URL')
  }

  console.log('Connected to database')
}
