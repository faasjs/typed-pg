import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

const testDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(testDir, '..', '..')
const workspaceRoot = resolve(packageRoot, '..', '..')

interface TypedPgDevPackageJson {
  exports: Record<
    string,
    {
      import: string
      require: string
      types: string
    }
  >
}

function readTypedPgDevPackageJson() {
  return JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
  ) as TypedPgDevPackageJson
}

describe('typed-pg-dev packaging', () => {
  it('exports the Vitest runtime helper entrypoints', () => {
    const packageJson = readTypedPgDevPackageJson()

    expect(packageJson.exports['./typed-pg-vitest-global-setup']).toEqual({
      types: './dist/typed-pg-vitest-global-setup.d.ts',
      import: './dist/typed-pg-vitest-global-setup.mjs',
      require: './dist/typed-pg-vitest-global-setup.cjs',
    })
    expect(packageJson.exports['./typed-pg-vitest-setup']).toEqual({
      types: './dist/typed-pg-vitest-setup.d.ts',
      import: './dist/typed-pg-vitest-setup.mjs',
      require: './dist/typed-pg-vitest-setup.cjs',
    })
  })

  it('packs the Vitest runtime helper entrypoints', async () => {
    const configModule = await import(pathToFileURL(join(workspaceRoot, 'vite.config.ts')).href)
    const packConfig = configModule.default.pack.find(
      (config: { cwd: string }) => config.cwd === join(workspaceRoot, 'packages', 'typed-pg-dev'),
    )

    expect(packConfig?.entry).toMatchObject({
      index: './src/index.ts',
      'typed-pg-vitest-global-setup': './src/typed-pg-vitest-global-setup.ts',
      'typed-pg-vitest-setup': './src/typed-pg-vitest-setup.ts',
    })
  })
})
