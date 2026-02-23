import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['src/__tests__/global-setup.ts'],
    fileParallelism: false,
    restoreMocks: true,
    clearMocks: true,
    typecheck: {
      enabled: true,
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'dist/**'],
      reporter: ['text', 'lcov', 'html'],
    },
    reporters: ['default', ['junit', { outputFile: 'test-report.junit.xml' }]],
  },
})
