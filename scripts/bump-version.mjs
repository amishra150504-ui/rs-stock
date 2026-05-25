import fs from 'fs'

const pkgPath = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

const current = String(pkg.version || '0.0.0')
const parts = current.split('.').map((n) => Number(n))
if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) {
  throw new Error(`Invalid version in package.json: ${current}`)
}

parts[2] += 1
const next = parts.join('.')
pkg.version = next

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n', 'utf8')
process.stdout.write(next)

