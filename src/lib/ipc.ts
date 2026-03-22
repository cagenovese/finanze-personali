/** Typed wrapper around the preload-exposed API. */

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

declare global {
  interface Window {
    api: {
      getStats: () => Promise<DbStats>
      getSources: () => Promise<Record<string, SourceConfig>>
      runImport: (sourceId: string) => Promise<ImportSourceResult>
      getImportHistory: () => Promise<ImportLogEntry[]>
    }
  }
}

const api = window.api

export function getStats(): Promise<DbStats> {
  return api.getStats()
}

export function getSources(): Promise<Record<string, SourceConfig>> {
  return api.getSources()
}

export function runImport(sourceId: string): Promise<ImportSourceResult> {
  return api.runImport(sourceId)
}

export function getImportHistory(): Promise<ImportLogEntry[]> {
  return api.getImportHistory()
}
