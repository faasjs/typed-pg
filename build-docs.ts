import { execSync } from 'node:child_process'
import { existsSync, globSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const generatedDocsRoot = join(root, 'tmp', 'api-docs', 'packages')

function quote(value: string) {
  return JSON.stringify(value)
}

function run(command: string) {
  console.log(command)
  execSync(command, {
    cwd: root,
    stdio: 'inherit',
  })
}

function getEntryPoints(packagePath: string) {
  const entryPoints = [join(packagePath, 'src', 'index.ts')]
  const vitestEntry = join(packagePath, 'src', 'vitest.ts')

  if (existsSync(vitestEntry)) entryPoints.push(vitestEntry)

  return entryPoints
}

function getExtraArgs(packageName: string) {
  if (packageName !== 'typed-pg') return []

  return [
    '--intentionallyNotExported',
    'Flatten',
    '--intentionallyNotExported',
    'InferColumnType',
    '--intentionallyNotExported',
    'QueryBuilder',
    '--intentionallyNotExported',
    'TableBuilder',
    '--intentionallyNotExported',
    'UnionToIntersection',
    '--intentionallyNotExported',
    'User',
  ]
}

function normalizeMarkdown(packageOutputDir: string) {
  const files = globSync('**/*.md', {
    cwd: packageOutputDir,
  })

  for (const file of files) {
    const absoluteFile = join(packageOutputDir, file)
    const content = readFileSync(absoluteFile, 'utf8')

    if (content.includes('\n***\n')) {
      writeFileSync(absoluteFile, content.replaceAll('\n***\n', '\n'))
    }
  }
}

function build(packageJsonPath: string) {
  const absolutePackageJsonPath = join(root, packageJsonPath)
  const pkg = JSON.parse(readFileSync(absolutePackageJsonPath, 'utf8'))

  if (!pkg.types) return

  const packagePath = dirname(absolutePackageJsonPath)
  const packageName = basename(packagePath)
  const packageOutputDir = join(generatedDocsRoot, packageName)
  const entryPoints = getEntryPoints(packagePath)
  const extraArgs = getExtraArgs(packageName)

  rmSync(packageOutputDir, { recursive: true, force: true })
  mkdirSync(packageOutputDir, { recursive: true })

  run(
    [
      'vp exec typedoc',
      ...entryPoints.map(quote),
      ...extraArgs.map(quote),
      '--tsconfig',
      quote(join(packagePath, 'tsconfig.json')),
      '--out',
      quote(packageOutputDir),
    ].join(' '),
  )

  normalizeMarkdown(packageOutputDir)
}

function buildAll() {
  const list = globSync('packages/*/package.json', {
    cwd: root,
  }).sort((a, b) => a.localeCompare(b))

  for (const file of list) {
    build(file)
  }
}

const packageArg = process.argv[2]

if (packageArg) build(join(packageArg, 'package.json'))
else buildAll()
