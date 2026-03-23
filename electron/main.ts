import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import {
  getDb, getImportHistory, getTransactionCount,
  getTransactions, updateTransaction, addManualTransaction, splitTransaction,
  getCategories, updateCategoryKeywords,
  getBudgets, setBudget, getSpendingByCategory, getAvailableMonths,
  getMonthlyNecessary, getAnnualTrend, getAvailableYears,
  getSplitwiseExpenses, getSplitwiseBalances,
  closeDb,
  type TransactionFilters,
} from './db'
import { importSource, getSourceConfig, type SourceId } from './parsers'
import { autoCategorize } from './categorizer'

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

  // ── Transactions ──────────────────────────────────
  ipcMain.handle('transactions:list', (_event, filters: TransactionFilters) => {
    return getTransactions(filters)
  })

  ipcMain.handle('transactions:update', (_event, id: number, fields: {
    category?: string | null; is_necessary?: number | null; notes?: string | null
  }) => {
    updateTransaction(id, fields)
    return true
  })

  ipcMain.handle('transactions:add-manual', (_event, tx: {
    date: string; description: string; amount: number; category: string | null; notes: string | null
  }) => {
    return addManualTransaction(tx)
  })

  ipcMain.handle('transactions:split', (_event, parentId: number, splits: {
    description: string; amount: number; category: string | null
  }[]) => {
    splitTransaction(parentId, splits)
    return true
  })

  // ── Categories ────────────────────────────────────
  ipcMain.handle('categories:list', () => {
    return getCategories()
  })

  ipcMain.handle('categories:updateKeywords', (_event, id: number, keywords: string[]) => {
    updateCategoryKeywords(id, keywords)
    return true
  })

  // ── Auto-categorization ───────────────────────────
  ipcMain.handle('categorize:run', () => {
    return { categorized: autoCategorize() }
  })

  // ── Budget ────────────────────────────────────────
  ipcMain.handle('budget:get', (_event, month: string) => {
    return getBudgets(month)
  })

  ipcMain.handle('budget:set', (_event, category: string, month: string, amount: number) => {
    setBudget(category, month, amount)
    return true
  })

  ipcMain.handle('budget:spending', (_event, month: string) => {
    return getSpendingByCategory(month)
  })

  ipcMain.handle('budget:months', () => {
    return getAvailableMonths()
  })

  // ── Report ────────────────────────────────────────
  ipcMain.handle('report:monthly-necessary', (_event, month: string) => {
    return getMonthlyNecessary(month)
  })

  ipcMain.handle('report:annual-trend', (_event, year: string) => {
    return getAnnualTrend(year)
  })

  ipcMain.handle('report:years', () => {
    return getAvailableYears()
  })

  // ── Splitwise ─────────────────────────────────────
  ipcMain.handle('splitwise:expenses', () => {
    return getSplitwiseExpenses()
  })

  ipcMain.handle('splitwise:balances', () => {
    return getSplitwiseBalances()
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
