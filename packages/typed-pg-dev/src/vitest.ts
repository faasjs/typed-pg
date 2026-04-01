/**
 * Vitest global setup entrypoint for `typed-pg-dev`.
 *
 * Import this file through `typed-pg-dev/vitest` in Vitest `globalSetup`.
 */
import { createVitestSetup } from './pglite'

export default createVitestSetup()
