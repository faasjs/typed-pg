import { copyFileSync, globSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const generatedPackagesRoot = join(root, 'tmp', 'api-docs', 'packages')
const referencesRoot = join(root, 'skills', 'typed-pg-best-practices', 'references', 'packages')

const files = globSync('**/*.md', {
  cwd: generatedPackagesRoot,
}).sort((a, b) => a.localeCompare(b))

if (!files.length) {
  throw new Error('No generated API markdown files found. Run `npm run doc` first.')
}

for (const packageDir of globSync('*', { cwd: generatedPackagesRoot })) {
  rmSync(join(referencesRoot, packageDir), { recursive: true, force: true })
}

for (const file of files) {
  const source = join(generatedPackagesRoot, file)
  const destination = join(referencesRoot, file)

  mkdirSync(dirname(destination), { recursive: true })
  copyFileSync(source, destination)
}

console.log(`Synced ${files.length} markdown files to ${referencesRoot}`)
