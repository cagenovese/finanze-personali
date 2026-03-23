/** Typed wrapper around the preload-exposed API. */

// ── Types ─────────────────────────────────────────────

export interface ImportSourceResult {
  source: string
  files: { fileName: string; imported: number; skipped: number }[]
  totalImported: number
  totalSkipped: number
}

export interface SourceConfig {
  label: string
  defaultPath: string
}

export interface ImportLogEntry {
  id: number
  timestamp: string
  source: string
  file_name: string
  records_imported: number
  records_skipped: number
}

export interface DbStats {
  transactionCount: number
}

export interface Transaction {
  id: number
  hash: string
  date: string
  description: string
  amount: number
  currency: string
  source: string
  category: string | null
  is_necessary: number | null
  notes: string | null
  created_at: string
  is_split: number
  split_from: number | null
}

export interface TransactionFilters {
  source?: string
  category?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  uncategorizedOnly?: boolean
}

export interface Category {
  id: number
  name: string
  keywords: string[]
}

export interface BudgetEntry {
  category: string
  budget: number
}

export interface SpendingEntry {
  category: string
  spent: number
}

export interface MonthlyNecessary {
  necessary: number
  unnecessary: number
  income: number
}

export interface MonthlyTrend {
  month: string
  spent: number
  income: number
  saved: number
}

export interface SplitwiseExpense {
  id: number
  hash: string
  date: string
  description: string
  category: string | null
  total_cost: number
  currency: string
  balances: Record<string, number>
}

// ── Window API declaration ────────────────────────────

declare global {
  interface Window {
    api: {
      getStats: () => Promise<DbStats>
      getSources: () => Promise<Record<string, SourceConfig>>
      runImport: (sourceId: string) => Promise<ImportSourceResult>
      getImportHistory: () => Promise<ImportLogEntry[]>
      getTransactions: (filters?: TransactionFilters) => Promise<Transaction[]>
      updateTransaction: (id: number, fields: {
        category?: string | null; is_necessary?: number | null; notes?: string | null
      }) => Promise<boolean>
      addManualTransaction: (tx: {
        date: string; description: string; amount: number; category: string | null; notes: string | null
      }) => Promise<number>
      splitTransaction: (parentId: number, splits: {
        description: string; amount: number; category: string | null
      }[]) => Promise<boolean>
      getCategories: () => Promise<Category[]>
      updateCategoryKeywords: (id: number, keywords: string[]) => Promise<boolean>
      runCategorization: () => Promise<{ categorized: number }>
      getBudgets: (month: string) => Promise<BudgetEntry[]>
      setBudget: (category: string, month: string, amount: number) => Promise<boolean>
      getSpending: (month: string) => Promise<SpendingEntry[]>
      getAvailableMonths: () => Promise<string[]>
      getMonthlyNecessary: (month: string) => Promise<MonthlyNecessary>
      getAnnualTrend: (year: string) => Promise<MonthlyTrend[]>
      getAvailableYears: () => Promise<string[]>
      getSplitwiseExpenses: () => Promise<SplitwiseExpense[]>
      getSplitwiseBalances: () => Promise<Record<string, number>>
    }
  }
}

// ── Exports ───────────────────────────────────────────

const api = window.api

export const getStats = () => api.getStats()
export const getSources = () => api.getSources()
export const runImport = (sourceId: string) => api.runImport(sourceId)
export const getImportHistory = () => api.getImportHistory()
export const getTransactions = (f?: TransactionFilters) => api.getTransactions(f)
export const updateTransaction = (id: number, fields: {
  category?: string | null; is_necessary?: number | null; notes?: string | null
}) => api.updateTransaction(id, fields)
export const addManualTransaction = (tx: {
  date: string; description: string; amount: number; category: string | null; notes: string | null
}) => api.addManualTransaction(tx)
export const splitTransaction = (parentId: number, splits: {
  description: string; amount: number; category: string | null
}[]) => api.splitTransaction(parentId, splits)
export const getCategories = () => api.getCategories()
export const updateCategoryKeywords = (id: number, kw: string[]) => api.updateCategoryKeywords(id, kw)
export const runCategorization = () => api.runCategorization()
export const getBudgets = (m: string) => api.getBudgets(m)
export const setBudget = (cat: string, month: string, amount: number) => api.setBudget(cat, month, amount)
export const getSpending = (m: string) => api.getSpending(m)
export const getAvailableMonths = () => api.getAvailableMonths()
export const getMonthlyNecessary = (month: string) => api.getMonthlyNecessary(month)
export const getAnnualTrend = (year: string) => api.getAnnualTrend(year)
export const getAvailableYears = () => api.getAvailableYears()
export const getSplitwiseExpenses = () => api.getSplitwiseExpenses()
export const getSplitwiseBalances = () => api.getSplitwiseBalances()
