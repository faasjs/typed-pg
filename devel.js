import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const packageDirectories = ['./packages/typed-pg', './packages/typed-pg-dev']
const versionSuffix = `devel-${Date.now()}`

const updatePackageVersion = (directory) => {
  const packageJsonPath = `${directory}/package.json`
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

  packageJson.version = `${packageJson.version}-${versionSuffix}`

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

execSync('npm run build', { stdio: 'inherit' })

for (const directory of packageDirectories) {
  updatePackageVersion(directory)

  execSync('npm publish --access public --tag devel', {
    cwd: directory,
    stdio: 'inherit',
  })
}
