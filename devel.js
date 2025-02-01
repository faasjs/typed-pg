import PackageJson from './package.json' with { type: 'json' }
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

PackageJson.version = `${PackageJson.version}-devel-${Date.now()}`

execSync('npm run build', { stdio: 'inherit' })

writeFileSync('./package.json', JSON.stringify(PackageJson, null, 2))

execSync('npm publish --access public --tag devel', {
  stdio: 'inherit',
})
