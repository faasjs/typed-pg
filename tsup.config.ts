import { defineConfig } from 'tsup'

export default defineConfig({
  format: ['esm', 'cjs'],
  clean: true,
  dts: true,
  treeshake: true,
  shims: true,
  outExtension({ format }) {
    if (format === 'cjs')
      return {
        js: '.cjs',
        dts: '.d.ts',
      }
    return {
      js: '.mjs',
      dts: '.d.ts',
    }
  },
})
