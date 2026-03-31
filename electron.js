import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const userDataDir = path.join(app.getPath('appData'), 'RS Stock Management')
app.setPath('userData', userDataDir)
app.setPath('cache', path.join(userDataDir, 'Cache'))

let mainWindow
const DEFAULT_PORT = 5173
const BASE_DIR = path.join(app.getPath('home'), 'Downloads', 'RS Stock', 'Local storage permanent')
const BACKUP_DIR = 'C:\\Users\\hp\\OneDrive\\Documents\\Stock Backup\\Backup'
const REPORT_DIR = 'C:\\Users\\hp\\OneDrive\\Documents\\Stock Backup\\stock pdf'

const safeName = (value, fallback = 'Company') => {
  const name = String(value || '').trim()
  const cleaned = name.replace(/[<>:"/\\|?*]+/g, '_').replace(/\s+/g, ' ').trim()
  return cleaned || fallback
}

const ensureDir = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true })
}

const writeJsonAtomic = async (filePath, data) => {
  const tempPath = `${filePath}.tmp`
  const payload = JSON.stringify(data, null, 2)
  await fs.promises.writeFile(tempPath, payload, 'utf8')
  await fs.promises.rename(tempPath, filePath)
}

const readJson = async (filePath) => {
  const raw = await fs.promises.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

const getCompanyFilePath = (companyId) =>
  path.join(BASE_DIR, `${safeName(companyId, 'company')}.json`)

const getUsersFilePath = () => path.join(BASE_DIR, 'users.json')

const getUploadDir = (companyId, kind) =>
  path.join(BASE_DIR, 'uploads', safeName(companyId, 'company'), safeName(kind, 'files'))

const getBackupFilePath = (companyName, dateKey) =>
  path.join(BACKUP_DIR, safeName(companyName), `${dateKey}.json`)

const getReportFilePath = (companyName, dateKey, reportType, ext) =>
  path.join(REPORT_DIR, safeName(companyName), dateKey, `${safeName(reportType)}.${ext}`)

// Helper to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = http.createServer()
    server.once('listening', () => {
      server.close()
      resolve(true)
    })
    server.once('error', () => resolve(false))
    server.listen(port, 'localhost')
  })
}

// Find an available port starting from DEFAULT_PORT
async function findAvailablePort(startPort = DEFAULT_PORT) {
  for (let i = 0; i < 10; i++) {
    const port = startPort + i
    if (await isPortAvailable(port)) {
      return port
    }
  }
  return startPort
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'public/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // optional: for future security
    }
  })
  Menu.setApplicationMenu(null)

  const forceDist = process.env.RS_FORCE_DIST === '1'
  if (app.isPackaged || forceDist) {
    // Production: load from built files
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  } else {
    // Development: dynamically find available port and load from localhost
    const port = await findAvailablePort(DEFAULT_PORT)
    const url = `http://localhost:${port}`
    console.log(`Loading Electron app from: ${url}`)
    mainWindow.loadURL(url)
    mainWindow.webContents.openDevTools() // Open DevTools in dev mode
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  ipcMain.handle('rs-read-company', async (_event, companyId) => {
    try {
      await ensureDir(BASE_DIR)
      const filePath = getCompanyFilePath(companyId)
      if (!fs.existsSync(filePath)) return null
      return await readJson(filePath)
    } catch (err) {
      console.error('read company error', err)
      return { error: String(err?.message || err) }
    }
  })

  ipcMain.handle('rs-write-company', async (_event, payload) => {
    try {
      const { companyId, data } = payload || {}
      if (!companyId) throw new Error('Missing companyId')
      await ensureDir(BASE_DIR)
      const filePath = getCompanyFilePath(companyId)
      await writeJsonAtomic(filePath, data || {})
      return { ok: true }
    } catch (err) {
      console.error('write company error', err)
      return { error: String(err?.message || err) }
    }
  })

  ipcMain.handle('rs-read-users', async () => {
    try {
      await ensureDir(BASE_DIR)
      const filePath = getUsersFilePath()
      if (!fs.existsSync(filePath)) return null
      return await readJson(filePath)
    } catch (err) {
      console.error('read users error', err)
      return { error: String(err?.message || err) }
    }
  })

  ipcMain.handle('rs-write-users', async (_event, payload) => {
    try {
      await ensureDir(BASE_DIR)
      const filePath = getUsersFilePath()
      await writeJsonAtomic(filePath, payload || {})
      return { ok: true }
    } catch (err) {
      console.error('write users error', err)
      return { error: String(err?.message || err) }
    }
  })

  ipcMain.handle('rs-save-backup', async (_event, payload) => {
    try {
      const { companyName, dateKey, data } = payload || {}
      if (!companyName || !dateKey) throw new Error('Missing backup metadata')
      const filePath = getBackupFilePath(companyName, dateKey)
      await ensureDir(path.dirname(filePath))
      await writeJsonAtomic(filePath, data || {})
      return { ok: true, filePath }
    } catch (err) {
      console.error('backup error', err)
      return { error: String(err?.message || err) }
    }
  })

  ipcMain.handle('rs-save-report', async (_event, payload) => {
    try {
      const { companyName, dateKey, reportType, ext, data } = payload || {}
      if (!companyName || !dateKey || !reportType || !ext) throw new Error('Missing report metadata')
      const filePath = getReportFilePath(companyName, dateKey, reportType, ext)
      await ensureDir(path.dirname(filePath))
      const buffer = data ? Buffer.from(data) : Buffer.from([])
      await fs.promises.writeFile(filePath, buffer)
      return { ok: true, filePath }
    } catch (err) {
      console.error('report save error', err)
      return { error: String(err?.message || err) }
    }
  })

  ipcMain.handle('rs-save-upload-file', async (_event, payload) => {
    try {
      const { companyId, kind, fileName, data } = payload || {}
      if (!companyId || !kind || !fileName || !data) throw new Error('Missing upload data')
      const targetDir = getUploadDir(companyId, kind)
      await ensureDir(targetDir)
      const safeFile = safeName(fileName, 'file')
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const filePath = path.join(targetDir, `${unique}-${safeFile}`)
      const buffer = Buffer.from(data)
      await fs.promises.writeFile(filePath, buffer)
      return { ok: true, filePath }
    } catch (err) {
      console.error('upload save error', err)
      return { error: String(err?.message || err) }
    }
  })

  ipcMain.handle('rs-delete-file', async (_event, payload) => {
    try {
      const target = String(payload?.path || payload || '')
      if (!target) throw new Error('Missing path')
      if (fs.existsSync(target)) {
        await fs.promises.unlink(target)
      }
      return { ok: true }
    } catch (err) {
      console.error('delete file error', err)
      return { error: String(err?.message || err) }
    }
  })

  ipcMain.handle('rs-open-path', async (_event, payload) => {
    try {
      const target = String(payload?.path || payload || '')
      if (!target) throw new Error('Missing path')
      await shell.openPath(target)
      return { ok: true }
    } catch (err) {
      console.error('open path error', err)
      return { error: String(err?.message || err) }
    }
  })

  ipcMain.handle('rs-show-item', async (_event, payload) => {
    try {
      const target = String(payload?.path || payload || '')
      if (!target) throw new Error('Missing path')
      shell.showItemInFolder(target)
      return { ok: true }
    } catch (err) {
      console.error('show item error', err)
      return { error: String(err?.message || err) }
    }
  })
})

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

export {}
