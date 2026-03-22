import { contextBridge, ipcRenderer } from 'electron'

// Typed API exposed to the renderer process.
// IPC handlers will be added here in later phases (parsers, DB, etc.)
contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping'),
})

export type Api = typeof api
declare global {
  interface Window {
    api: {
      ping: () => Promise<string>
    }
  }
}
