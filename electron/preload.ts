import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // DB
  getStats: () => ipcRenderer.invoke('db:stats') as Promise<{ transactionCount: number }>,

  // Import
  getSources: () => ipcRenderer.invoke('import:sources') as Promise<
    Record<string, { label: string; defaultPath: string }>
  >,
  runImport: (sourceId: string) => ipcRenderer.invoke('import:run', sourceId) as Promise<{
    source: string
    files: { fileName: string; imported: number; skipped: number }[]
    totalImported: number
    totalSkipped: number
  }>,
  getImportHistory: () => ipcRenderer.invoke('import:history') as Promise<any[]>,

  // Transactions
  getTransactions: (filters?: {
    source?: string; category?: string; search?: string;
    dateFrom?: string; dateTo?: string; uncategorizedOnly?: boolean;
  }) => ipcRenderer.invoke('transactions:list', filters ?? {}) as Promise<any[]>,

  updateTransaction: (id: number, fields: {
    category?: string | null; is_necessary?: number | null; notes?: string | null;
  }) => ipcRenderer.invoke('transactions:update', id, fields) as Promise<boolean>,

  // Categories
  getCategories: () => ipcRenderer.invoke('categories:list') as Promise<
    { id: number; name: string; keywords: string[] }[]
  >,

  updateCategoryKeywords: (id: number, keywords: string[]) =>
    ipcRenderer.invoke('categories:updateKeywords', id, keywords) as Promise<boolean>,

  // Auto-categorization
  runCategorization: () => ipcRenderer.invoke('categorize:run') as Promise<{ categorized: number }>,

  // Budget
  getBudgets: (month: string) => ipcRenderer.invoke('budget:get', month) as Promise<
    { category: string; budget: number }[]
  >,
  setBudget: (category: string, month: string, amount: number) =>
    ipcRenderer.invoke('budget:set', category, month, amount) as Promise<boolean>,
  getSpending: (month: string) => ipcRenderer.invoke('budget:spending', month) as Promise<
    { category: string; spent: number }[]
  >,
  getAvailableMonths: () => ipcRenderer.invoke('budget:months') as Promise<string[]>,

  // Splitwise
  getSplitwiseExpenses: () => ipcRenderer.invoke('splitwise:expenses') as Promise<any[]>,
  getSplitwiseBalances: () => ipcRenderer.invoke('splitwise:balances') as Promise<Record<string, number>>,
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
