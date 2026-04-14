import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin } from 'vitest/config'

const moduleFilename = typeof __filename === 'string' ? __filename : fileURLToPath(import.meta.url)
const moduleDirname = dirname(moduleFilename)
const moduleExtension = extname(moduleFilename) === '.ts' ? '.ts' : extname(moduleFilename)
const indexPath = join(moduleDirname, `index${moduleExtension}`)
const globalSetupPath = join(moduleDirname, `typed-pg-vitest-global-setup${moduleExtension}`)

const DEFAULT_SKIPPED_ENVIRONMENTS = new Set(['happy-dom', 'jsdom'])
let nextVirtualModuleId = 0

function prependUniqueValue(value: string | string[] | undefined, nextValue: string) {
  const values = typeof value === 'undefined' ? [] : Array.isArray(value) ? value : [value]

  return [nextValue, ...values.filter((item) => item !== nextValue)]
}

export interface TypedPgVitestPluginOptions {
  /**
   * Restricts the plugin to the listed Vitest project names.
   */
  projects?: string[]
  /**
   * Restricts the plugin to the listed Vitest environments.
   */
  environments?: string[]
  /**
   * Optional project-local cleanup function invoked before each database reset.
   *
   * Pass a module specifier or `<module>#<exportName>`. When no export name is provided, `default`
   * is used.
   */
  beforeReset?: string
}

function shouldEnableForProject(
  project: {
    config: {
      environment?: string
      name?: string
    }
  },
  options: TypedPgVitestPluginOptions,
) {
  const projectName = project.config.name
  const environment = project.config.environment ?? 'node'

  if (options.projects?.length && (!projectName || !options.projects.includes(projectName))) {
    return false
  }

  if (options.environments?.length) {
    return options.environments.includes(environment)
  }

  return !DEFAULT_SKIPPED_ENVIRONMENTS.has(environment)
}

/**
 * Creates the Vitest plugin that wires `typed-pg-dev` into the test runner.
 *
 * The plugin starts worker-isolated temporary databases, runs migrations from `./migrations`,
 * injects the connection string into `process.env.DATABASE_URL`, and clears table contents before
 * each test.
 *
 * By default the plugin skips browser-like projects such as `jsdom` and `happy-dom`. Pass
 * `environments` or `projects` to opt into a narrower set explicitly.
 *
 * @param {TypedPgVitestPluginOptions} [options] - Optional project filters.
 * @returns Vitest/Vite plugin instance.
 */
export function TypedPgVitestPlugin(options: TypedPgVitestPluginOptions = {}): Plugin {
  const instanceId = (nextVirtualModuleId += 1)
  const setupPublicId = `virtual:typed-pg-dev/vitest-setup-${instanceId}`
  const globalSetupPublicId = `virtual:typed-pg-dev/vitest-global-setup-${instanceId}`
  const setupResolvedId = `\0${setupPublicId}`
  const globalSetupResolvedId = `\0${globalSetupPublicId}`

  return {
    name: 'typed-pg-vitest-plugin',
    resolveId(id) {
      if (id === setupPublicId) return setupResolvedId
      if (id === globalSetupPublicId) return globalSetupResolvedId
    },
    load(id) {
      if (id === setupResolvedId) {
        const [beforeResetModule, beforeResetExportName = 'default'] = (
          options.beforeReset?.split('#') ?? []
        ).filter(Boolean)
        const beforeResetAlias = '__typedPgVitestBeforeReset'

        return [
          "import { beforeEach, inject, vi } from 'vitest'",
          `import { closeTrackedTypedPgClients, installTypedPgClientTracking, setupTypedPgVitest } from ${JSON.stringify(indexPath)}`,
          ...(beforeResetModule
            ? [
                beforeResetExportName === 'default'
                  ? `import ${beforeResetAlias} from ${JSON.stringify(beforeResetModule)}`
                  : `import { ${beforeResetExportName} as ${beforeResetAlias} } from ${JSON.stringify(beforeResetModule)}`,
              ]
            : []),
          '',
          'installTypedPgClientTracking(vi)',
          'setupTypedPgVitest(',
          '  { beforeEach, inject },',
          '  {',
          '    beforeReset: async () => {',
          '      await closeTrackedTypedPgClients()',
          ...(beforeResetModule ? [`      await ${beforeResetAlias}?.()`] : []),
          '    },',
          '  },',
          ')',
          '',
        ].join('\n')
      }

      if (id === globalSetupResolvedId) {
        return [
          `import setup from ${JSON.stringify(globalSetupPath)}`,
          '',
          'export default setup',
          '',
        ].join('\n')
      }
    },
    configureVitest({ project }) {
      if (!shouldEnableForProject(project, options)) return

      project.config.globalSetup = prependUniqueValue(
        project.config.globalSetup,
        globalSetupPublicId,
      )
      project.config.setupFiles = prependUniqueValue(project.config.setupFiles, setupPublicId)
    },
  }
}
