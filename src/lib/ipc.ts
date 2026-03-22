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
      getCategories: () => Promise<Category[]>
      updateCategoryKeywords: (id: number, keywords: string[]) => Promise<boolean>
      runCategorization: () => Promise<{ categorized: number }>
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
export const getCategories = () => api.getCategories()
export const updateCategoryKeywords = (id: number, kw: string[]) => api.updateCategoryKeywords(id, kw)
export const runCategorization = () => api.runCategorization()
