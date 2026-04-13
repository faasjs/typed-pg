import { join } from 'node:path'

import { viteConfig } from '@faasjs/dev'
import { defineConfig, type UserConfig } from 'vite-plus'
import type { PackUserConfig } from 'vite-plus/pack'

const pack: PackUserConfig[] = [
  {
    cwd: join(process.cwd(), 'packages', 'typed-pg'),
    entry: {
      index: './src/index.ts',
      'cli/index': './src/cli/index.ts',
    },
    platform: 'node',
    format: ['esm', 'cjs'],
    checks: {
      legacyCjs: false,
    },
    clean: true,
    dts: {
      sourcemap: false,
      eager: true,
    },
    deps: {
      skipNodeModulesBundle: true,
    },
    sourcemap: false,
    treeshake: true,
    tsconfig: join(process.cwd(), 'tsconfig.build.json'),
    shims: true,
    outExtensions({ format }) {
      if (format === 'es') {
        return {
          js: '.mjs',
          dts: '.d.ts',
        }
      }

      return {
        js: '.cjs',
        dts: '.d.ts',
      }
    },
  },
  {
    cwd: join(process.cwd(), 'packages', 'typed-pg-dev'),
    entry: {
      index: './src/index.ts',
      plugin: './src/plugin.ts',
      'typed-pg-vitest-global-setup': './src/typed-pg-vitest-global-setup.ts',
      'typed-pg-vitest-setup': './src/typed-pg-vitest-setup.ts',
    },
    platform: 'node',
    format: ['esm', 'cjs'],
    checks: {
      legacyCjs: false,
    },
    clean: true,
    dts: {
      sourcemap: false,
      eager: true,
    },
    deps: {
      skipNodeModulesBundle: true,
    },
    sourcemap: false,
    treeshake: true,
    tsconfig: join(process.cwd(), 'tsconfig.build.json'),
    shims: true,
    outExtensions({ format }) {
      if (format === 'es') {
        return {
          js: '.mjs',
          dts: '.d.ts',
        }
      }

      return {
        js: '.cjs',
        dts: '.d.ts',
      }
    },
  },
]

export default defineConfig({
  ...viteConfig,
  lint: {
    ...viteConfig.lint,
    rules: {
      ...viteConfig.lint?.rules,
      'jest/no-export': 'off',
      'unicorn/no-thenable': 'off',
    },
  },
  pack,
  test: {
    alias: {
      'typed-pg': join(process.cwd(), 'packages', 'typed-pg', 'src', 'index.ts'),
    },
    globalSetup: ['packages/typed-pg/src/__tests__/global-setup.ts'],
    fileParallelism: false,
    restoreMocks: true,
    clearMocks: true,
    typecheck: {
      enabled: true,
    },
    coverage: {
      provider: 'v8',
      include: ['packages/**/*.ts'],
      exclude: ['packages/**/__tests__/**', 'packages/**/dist/**', 'packages/**/test-utils/**'],
      reporter: ['text', 'lcov', 'html'],
    },
    reporters: ['default', ['junit', { outputFile: 'test-report.junit.xml' }]],
  },
} as UserConfig)
