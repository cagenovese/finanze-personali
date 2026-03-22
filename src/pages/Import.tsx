import { useEffect, useState, useCallback } from 'react'
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  Building2,
  Landmark,
  Wallet,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  getSources,
  runImport,
  getImportHistory,
  type SourceConfig,
  type ImportSourceResult,
  type ImportLogEntry,
} from '@/lib/ipc'

const SOURCE_ICONS: Record<string, React.ElementType> = {
  n26: CreditCard,
  revolut: Wallet,
  commerzbank: Landmark,
  amex: Building2,
  traderepublic: TrendingUp,
  splitwise: Users,
}

type ImportStatus = 'idle' | 'loading' | 'done' | 'error'

interface SourceState {
  status: ImportStatus
  result?: ImportSourceResult
  error?: string
}

export default function Import() {
  const [sources, setSources] = useState<Record<string, SourceConfig>>({})
  const [states, setStates] = useState<Record<string, SourceState>>({})
  const [history, setHistory] = useState<ImportLogEntry[]>([])

  useEffect(() => {
    getSources().then(setSources)
    getImportHistory().then(setHistory)
  }, [])

  const handleImport = useCallback(async (sourceId: string) => {
    setStates(prev => ({ ...prev, [sourceId]: { status: 'loading' } }))
    try {
      const result = await runImport(sourceId)
      setStates(prev => ({ ...prev, [sourceId]: { status: 'done', result } }))
      getImportHistory().then(setHistory)
    } catch (e: any) {
      setStates(prev => ({
        ...prev,
        [sourceId]: { status: 'error', error: e.message || 'Import failed' },
      }))
    }
  }, [])

  const handleImportAll = useCallback(async () => {
    for (const sourceId of Object.keys(sources)) {
      await handleImport(sourceId)
    }
  }, [sources, handleImport])

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-label mb-2">DATI</p>
          <h1 className="text-2xl font-sans text-text-primary">Import</h1>
        </div>
        <button
          onClick={handleImportAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-accent-base text-bg-base font-sans text-sm font-medium transition-obsidian hover:bg-accent-bright active:scale-[0.98]"
        >
          <Upload size={16} />
          Importa tutto
        </button>
      </div>

      {/* Source cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {Object.entries(sources).map(([id, config]) => {
          const Icon = SOURCE_ICONS[id] || CreditCard
          const state = states[id] || { status: 'idle' as const }

          return (
            <div
              key={id}
              className="flex items-center gap-4 p-4 rounded-card bg-bg-surface border border-bg-elevated"
            >
              <div className="shrink-0 w-10 h-10 rounded-btn bg-bg-elevated flex items-center justify-center">
                <Icon size={18} className="text-accent-base" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary font-medium truncate">
                  {config.label}
                </p>
                {state.status === 'done' && state.result && (
                  <p className="text-xs text-positive font-mono mt-0.5">
                    +{state.result.totalImported} importate, {state.result.totalSkipped} skip
                  </p>
                )}
                {state.status === 'error' && (
                  <p className="text-xs text-negative mt-0.5 truncate">
                    {state.error}
                  </p>
                )}
                {state.status === 'idle' && (
                  <p className="text-xs text-text-muted mt-0.5 truncate font-mono">
                    {config.defaultPath.split('/').slice(-1)}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleImport(id)}
                disabled={state.status === 'loading'}
                className="shrink-0 w-9 h-9 rounded-btn flex items-center justify-center transition-obsidian border border-accent-mid text-accent-base hover:bg-bg-elevated disabled:opacity-40"
              >
                {state.status === 'loading' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : state.status === 'done' ? (
                  <CheckCircle size={16} className="text-positive" />
                ) : state.status === 'error' ? (
                  <AlertCircle size={16} className="text-negative" />
                ) : (
                  <Upload size={16} />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Import History */}
      {history.length > 0 && (
        <div>
          <p className="section-label mb-3">STORICO IMPORTAZIONI</p>
          <div className="bg-bg-surface border border-bg-elevated rounded-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-elevated">
                  <th className="text-left py-2.5 px-4 section-label font-normal">Data</th>
                  <th className="text-left py-2.5 px-4 section-label font-normal">Fonte</th>
                  <th className="text-left py-2.5 px-4 section-label font-normal">File</th>
                  <th className="text-right py-2.5 px-4 section-label font-normal">Import.</th>
                  <th className="text-right py-2.5 px-4 section-label font-normal">Skip</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map(entry => (
                  <tr key={entry.id} className="border-b border-bg-elevated last:border-none">
                    <td className="py-2 px-4 text-text-muted font-mono text-xs">
                      {entry.timestamp}
                    </td>
                    <td className="py-2 px-4 text-text-secondary">{entry.source}</td>
                    <td className="py-2 px-4 text-text-secondary truncate max-w-[200px]">
                      {entry.file_name}
                    </td>
                    <td className="py-2 px-4 text-right text-positive font-mono">
                      {entry.records_imported}
                    </td>
                    <td className="py-2 px-4 text-right text-text-muted font-mono">
                      {entry.records_skipped}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
