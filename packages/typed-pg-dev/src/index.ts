/**
 * typed-pg-dev package.
 *
 * The published surface only exposes `TypedPgVitestPlugin`, which boots a temporary PostgreSQL
 * database for Vitest and wires `process.env.DATABASE_URL` automatically.
 */
export { TypedPgVitestPlugin } from './plugin'
