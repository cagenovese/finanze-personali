import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { getDb, getImportHistory, getTransactionCount, closeDb } from './db'
import { importSource, getSourceConfig, type SourceId } from './parsers'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0E0F13',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  // ── DB status ──────────────────────────────────────
  ipcMain.handle('db:stats', () => {
    return { transactionCount: getTransactionCount() }
  })

  // ── Sources config ─────────────────────────────────
  ipcMain.handle('import:sources', () => {
    return getSourceConfig()
  })

  // ── Import from a source ───────────────────────────
  ipcMain.handle('import:run', async (_event, sourceId: SourceId) => {
    return importSource(sourceId)
  })

  // ── Import history ─────────────────────────────────
  ipcMain.handle('import:history', () => {
    return getImportHistory()
  })
}

app.whenReady().then(() => {
  // Initialise DB on startup
  getDb()

  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  closeDb()
})
