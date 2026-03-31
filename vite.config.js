import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
const buildInfo = {
  version: pkg.version || '0.0.0',
  buildTime: new Date().toISOString()
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'rs-stock-build-info',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify(buildInfo)
        })
      }
    }
  ],
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo)
  },
  build: {
    chunkSizeWarningLimit: 1200
  }
})
