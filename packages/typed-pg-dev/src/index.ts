/**
 * typed-pg-dev package.
 *
 * The published surface only exposes `TypedPgVitestPlugin`, which boots a temporary PostgreSQL
 * database for Vitest and wires `process.env.DATABASE_URL` automatically.
 */
export { TypedPgVitestPlugin } from './plugin'
export { closeTrackedTypedPgClients, installTypedPgClientTracking } from './client-tracking'
export { setupTypedPgVitest, type TypedPgVitestSetupOptions } from './setup-helper'
