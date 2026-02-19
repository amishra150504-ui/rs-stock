import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow
const DEFAULT_PORT = 5173

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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // optional: for future security
    }
  })

  if (app.isPackaged) {
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

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

export {}
