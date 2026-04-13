import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin } from 'vitest/config'

const moduleFilename = typeof __filename === 'string' ? __filename : fileURLToPath(import.meta.url)
const moduleDirname = dirname(moduleFilename)
const moduleExtension = extname(moduleFilename) === '.ts' ? '.ts' : extname(moduleFilename)
const globalSetupPath = join(moduleDirname, `typed-pg-vitest-global-setup${moduleExtension}`)
const setupFilePath = join(moduleDirname, `typed-pg-vitest-setup${moduleExtension}`)

function prependUniqueValue(value: string | string[] | undefined, nextValue: string) {
  const values = typeof value === 'undefined' ? [] : Array.isArray(value) ? value : [value]

  return [nextValue, ...values.filter((item) => item !== nextValue)]
}

/**
 * Creates the Vitest plugin that wires `typed-pg-dev` into the test runner.
 *
 * The plugin starts worker-isolated temporary databases, runs migrations from `./migrations`,
 * injects the connection string into `process.env.DATABASE_URL`, and clears table contents before
 * each test.
 *
 * @returns Vitest/Vite plugin instance.
 */
export function TypedPgVitestPlugin(): Plugin {
  return {
    name: 'typed-pg-vitest-plugin',
    configureVitest({ project }) {
      project.config.globalSetup = prependUniqueValue(project.config.globalSetup, globalSetupPath)
      project.config.setupFiles = prependUniqueValue(project.config.setupFiles, setupFilePath)
    },
  }
}
