import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import fs from 'fs'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const userDataDir = path.join(app.getPath('appData'), 'RS Stock Management')
app.setPath('userData', userDataDir)
app.setPath('cache', path.join(userDataDir, 'Cache'))

let mainWindow
let splashWindow
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

const getDesktopInstallDir = () =>
  path.join(app.getPath('desktop'), 'LAXMI AGENCY')

const getDesktopUpdatesDir = () =>
  path.join(getDesktopInstallDir(), 'updates')

const getDesktopUpdateExePath = () =>
  path.join(getDesktopUpdatesDir(), 'Management-System.new.exe')

const getDesktopUpdateVersionPath = () =>
  path.join(getDesktopUpdatesDir(), 'version.json')

// Local-only updates directory (inside the RS Stock folder, not in OneDrive)
// Updates are staged here by `npm run release:local` and applied on next restart.
const getLocalPendingDir = () =>
  path.join(app.getPath('home'), 'Downloads', 'RS Stock', 'updates', 'pending')
const getLocalPendingAsarPath = () => path.join(getLocalPendingDir(), 'app.asar')
const getLocalPendingVersionPath = () => path.join(getLocalPendingDir(), 'version.json')

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
  // Quick splash to improve perceived startup time.
  splashWindow = new BrowserWindow({
    width: 420,
    height: 260,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const splashHtml = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body{margin:0;background:transparent;font-family:Segoe UI,Arial,sans-serif}
        .card{height:100vh;display:flex;align-items:center;justify-content:center}
        .inner{width:380px;background:linear-gradient(135deg,#ffffff,#eef2ff);border:1px solid #dbeafe;border-radius:18px;box-shadow:0 20px 60px rgba(15,23,42,.25);padding:18px 18px}
        .title{font-weight:900;color:#0f172a;font-size:18px;letter-spacing:.2px}
        .sub{margin-top:6px;color:#475569;font-weight:700;font-size:12px}
        .bar{margin-top:14px;height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden}
        .bar > div{height:100%;width:40%;background:linear-gradient(90deg,#3b82f6,#7c3aed);border-radius:999px;animation:move 1.2s ease-in-out infinite}
        @keyframes move{0%{transform:translateX(-30%)}50%{transform:translateX(160%)}100%{transform:translateX(-30%)}}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="inner">
          <div class="title">LAXMI AGENCY</div>
          <div class="sub">Loading…</div>
          <div class="bar"><div></div></div>
        </div>
      </div>
    </body>
  </html>`

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`)
  splashWindow.center()

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'public/icon.png'),
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#f3f6ff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // optional: for future security
    }
  })
  Menu.setApplicationMenu(null)

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return
    mainWindow.show()
    if (splashWindow) {
      splashWindow.close()
      splashWindow = null
    }
  })

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
    if (splashWindow) {
      splashWindow.close()
      splashWindow = null
    }
  })
}

app.whenReady().then(() => {
  const applyPendingLocalUpdate = async () => {
    if (!app.isPackaged) return
    const pendingAsar = getLocalPendingAsarPath()
    const pendingVersion = getLocalPendingVersionPath()
    if (!fs.existsSync(pendingAsar) || !fs.existsSync(pendingVersion)) return

    const targetAsar = path.join(process.resourcesPath, 'app.asar')
    const tempPs = path.join(app.getPath('temp'), `laxmi-agency-apply-update-${Date.now()}.ps1`)
    const psScript = `
$ErrorActionPreference = "Stop"
$pendingAsar = "${pendingAsar.replace(/"/g, '""')}"
$targetAsar = "${targetAsar.replace(/"/g, '""')}"
$pendingDir = "${getLocalPendingDir().replace(/"/g, '""')}"
$pid = ${process.pid}

try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
for ($i=0; $i -lt 80; $i++) {
  $p = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if (-not $p) { break }
  Start-Sleep -Milliseconds 200
}

Copy-Item -Force $pendingAsar $targetAsar
Remove-Item -Force (Join-Path $pendingDir \"app.asar\") -ErrorAction SilentlyContinue
Remove-Item -Force (Join-Path $pendingDir \"version.json\") -ErrorAction SilentlyContinue
Start-Process -FilePath \"${process.execPath.replace(/"/g, '""')}\" -WorkingDirectory \"${path.dirname(process.execPath).replace(/"/g, '""')}\"
`
    await fs.promises.writeFile(tempPs, psScript, 'utf8')
    const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tempPs], {
      detached: true,
      stdio: 'ignore'
    })
    child.unref()
    setTimeout(() => app.quit(), 150)
  }

  // If an update package exists, apply it on restart.
  void applyPendingLocalUpdate()

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

  ipcMain.handle('rs-app-path-info', async () => {
    try {
      return {
        execPath: process.execPath,
        appPath: app.getAppPath(),
        isPackaged: app.isPackaged
      }
    } catch (err) {
      return { error: String(err?.message || err) }
    }
  })

  ipcMain.handle('rs-local-update-check', async () => {
    try {
      const pendingAsar = getLocalPendingAsarPath()
      const pendingVersion = getLocalPendingVersionPath()
      if (!fs.existsSync(pendingAsar) || !fs.existsSync(pendingVersion)) return { available: false }
      const raw = await fs.promises.readFile(pendingVersion, 'utf8')
      const info = JSON.parse(raw)
      return { available: true, info }
    } catch (err) {
      return { available: false, error: String(err?.message || err) }
    }
  })

  ipcMain.handle('rs-local-update-apply', async () => {
    try {
      // Just quit; next start will apply pending update.
      setTimeout(() => app.quit(), 150)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err?.message || err) }
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
