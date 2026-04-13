import { defineConfig } from 'vitest/config'

import { TypedPgVitestPlugin } from '../../plugin'

export function createFixtureVitestConfig(test: Record<string, unknown>) {
  return defineConfig({
    plugins: [TypedPgVitestPlugin()],
    test,
  })
}
