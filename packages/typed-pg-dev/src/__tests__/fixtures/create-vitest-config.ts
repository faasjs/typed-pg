import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

import { TypedPgVitestPlugin } from '../../plugin'

const fixturesDir = dirname(fileURLToPath(import.meta.url))
const typedPgEntry = resolve(fixturesDir, '..', '..', '..', '..', 'typed-pg', 'src', 'index.ts')

export function createFixtureVitestConfig(test: Record<string, unknown>) {
  return defineConfig({
    resolve: {
      alias: {
        'typed-pg': typedPgEntry,
      },
    },
    plugins: [TypedPgVitestPlugin()],
    test,
  })
}
