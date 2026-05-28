import fs from 'node:fs/promises'
import path from 'node:path'
import pngToIco from 'png-to-ico'

const root = process.cwd()
const srcPng = path.join(root, 'public', 'laxmi-agency.png')
const outIco = path.join(root, 'public', 'icon.ico')
const outPng = path.join(root, 'public', 'icon.png')

const run = async () => {
  const png = await fs.readFile(srcPng)

  // Keep a matching icon.png for BrowserWindow and other places.
  await fs.writeFile(outPng, png)

  // Generate multi-size .ico for Windows installer/app icon.
  const ico = await pngToIco(png)
  await fs.writeFile(outIco, ico)
}

run().catch((err) => {
  console.error('icon:generate failed', err)
  process.exit(1)
})

