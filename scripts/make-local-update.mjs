import fs from 'node:fs/promises'
import fssync from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = process.cwd()

// Must match `electron.js` (local-only updates staged inside the RS Stock folder).
const pendingDir = path.join(os.homedir(), 'Downloads', 'RS Stock', 'updates', 'pending')

const builtAsar = path.join(root, 'release-dist', 'win-unpacked', 'resources', 'app.asar')
const builtVersionJson = path.join(root, 'dist', 'version.json')

const ensureDir = async (dir) => fs.mkdir(dir, { recursive: true })

const copyFile = async (src, dest) => {
  await fs.copyFile(src, dest)
}

const run = async () => {
  if (!fssync.existsSync(builtAsar)) {
    console.error(`Missing built asar: ${builtAsar}`)
    console.error('Run an Electron build first (electron-builder) so win-unpacked is created.')
    process.exit(1)
  }

  if (!fssync.existsSync(builtVersionJson)) {
    console.error(`Missing dist/version.json: ${builtVersionJson}`)
    console.error('Run `npm run build` first.')
    process.exit(1)
  }

  await ensureDir(pendingDir)

  await copyFile(builtAsar, path.join(pendingDir, 'app.asar'))
  await copyFile(builtVersionJson, path.join(pendingDir, 'version.json'))

  console.log(`Local update staged in: ${pendingDir}`)
}

run().catch((err) => {
  console.error('make-local-update failed', err)
  process.exit(1)
})

