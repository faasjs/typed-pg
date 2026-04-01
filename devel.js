import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

import PackageJson from './packages/typed-pg/package.json' with { type: 'json' }

PackageJson.version = `${PackageJson.version}-devel-${Date.now()}`

execSync('npm run build', { stdio: 'inherit' })

writeFileSync('./packages/typed-pg/package.json', `${JSON.stringify(PackageJson, null, 2)}\n`)

execSync('npm publish --access public --tag devel', {
  cwd: './packages/typed-pg',
  stdio: 'inherit',
})
