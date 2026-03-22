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
  getImportHistory: () => ipcRenderer.invoke('import:history') as Promise<
    { id: number; timestamp: string; source: string; file_name: string; records_imported: number; records_skipped: number }[]
  >,
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
