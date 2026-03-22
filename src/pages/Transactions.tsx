import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, Search, Sparkles, Filter, X } from 'lucide-react'
import {
  getTransactions,
  getCategories,
  updateTransaction,
  runCategorization,
  type Transaction,
  type Category,
} from '@/lib/ipc'

export default function Transactions() {
  const [data, setData] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null)

  const reload = useCallback(() => {
    const dateFrom = monthFilter ? `${monthFilter}-01` : undefined
    const dateTo = monthFilter
      ? (() => {
          const [y, m] = monthFilter.split('-').map(Number)
          const lastDay = new Date(y, m, 0).getDate()
          return `${monthFilter}-${String(lastDay).padStart(2, '0')}`
        })()
      : undefined

    getTransactions({
      source: sourceFilter || undefined,
      category: categoryFilter || undefined,
      dateFrom,
      dateTo,
    }).then(setData)
  }, [sourceFilter, categoryFilter, monthFilter])

  useEffect(() => {
    reload()
    getCategories().then(setCategories)
  }, [reload])

  const handleUpdate = useCallback(
    async (id: number, fields: { category?: string | null; is_necessary?: number | null }) => {
      await updateTransaction(id, fields)
      setData(prev => prev.map(t => (t.id === id ? { ...t, ...fields } : t)))
    },
    []
  )

  const handleCategorize = useCallback(async () => {
    const { categorized } = await runCategorization()
    if (categorized > 0) reload()
  }, [reload])

  const sources = useMemo(() => [...new Set(data.map(t => t.source))].sort(), [data])

  // Build available months from all transactions (not just filtered)
  const [allMonths, setAllMonths] = useState<string[]>([])
  useEffect(() => {
    getTransactions({}).then(all => {
      const months = [...new Set(all.map(t => t.date.slice(0, 7)))].sort().reverse()
      setAllMonths(months)
    })
  }, [])

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Data',
        size: 110,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-text-secondary">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Descrizione',
        size: 300,
        cell: ({ getValue }) => (
          <span className="text-sm text-text-primary truncate block max-w-[300px]" title={getValue<string>()}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Importo',
        size: 110,
        cell: ({ getValue }) => {
          const val = getValue<number>()
          const color = val >= 0 ? 'text-positive' : 'text-negative'
          return (
            <span className={`font-mono text-sm ${color} text-right block`}>
              {val >= 0 ? '+' : ''}
              {val.toFixed(2)} €
            </span>
          )
        },
      },
      {
        accessorKey: 'source',
        header: 'Fonte',
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-xs text-text-muted uppercase tracking-wider">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Categoria',
        size: 150,
        cell: ({ row }) => {
          const tx = row.original
          const isEditing = editingCell?.rowId === tx.id && editingCell?.field === 'category'

          if (isEditing) {
            return (
              <select
                autoFocus
                className="bg-bg-elevated text-text-primary text-sm rounded-chip px-2 py-1 border border-accent-mid outline-none w-full"
                value={tx.category || ''}
                onChange={e => {
                  const val = e.target.value || null
                  handleUpdate(tx.id, { category: val })
                  setEditingCell(null)
                }}
                onBlur={() => setEditingCell(null)}
              >
                <option value="">— Nessuna —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            )
          }

          return (
            <button
              onClick={() => setEditingCell({ rowId: tx.id, field: 'category' })}
              className={`text-sm px-2 py-0.5 rounded-chip border transition-obsidian ${
                tx.category
                  ? 'bg-bg-elevated border-accent-dim text-text-secondary hover:border-accent-mid'
                  : 'bg-transparent border-bg-elevated text-text-muted hover:border-accent-dim'
              }`}
            >
              {tx.category || '—'}
            </button>
          )
        },
      },
      {
        accessorKey: 'is_necessary',
        header: 'Nec.',
        size: 60,
        cell: ({ row }) => {
          const tx = row.original
          const val = tx.is_necessary
          return (
            <button
              onClick={() => {
                // cycle: null → 1 → 0 → null
                const next = val === null ? 1 : val === 1 ? 0 : null
                handleUpdate(tx.id, { is_necessary: next })
              }}
              className={`w-7 h-7 rounded-chip flex items-center justify-center text-xs font-mono transition-obsidian border ${
                val === 1
                  ? 'bg-positive/15 border-positive/30 text-positive'
                  : val === 0
                    ? 'bg-negative/15 border-negative/30 text-negative'
                    : 'bg-transparent border-bg-elevated text-text-muted hover:border-accent-dim'
              }`}
              title={val === 1 ? 'Necessaria' : val === 0 ? 'Non necessaria' : 'Non classificata'}
            >
              {val === 1 ? 'S' : val === 0 ? 'N' : '·'}
            </button>
          )
        },
      },
    ],
    [categories, editingCell, handleUpdate]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      return row.original.description.toLowerCase().includes(filterValue.toLowerCase())
    },
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-label mb-1">REGISTRO</p>
            <h1 className="text-2xl font-sans text-text-primary">Transazioni</h1>
          </div>
          <button
            onClick={handleCategorize}
            className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-accent-base text-bg-base font-sans text-sm font-medium transition-obsidian hover:bg-accent-bright active:scale-[0.98]"
          >
            <Sparkles size={16} />
            Auto-categorizza
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cerca descrizione..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-btn bg-bg-surface border border-bg-elevated text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-mid transition-obsidian"
            />
            {globalFilter && (
              <button onClick={() => setGlobalFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-btn bg-bg-surface border border-bg-elevated text-sm text-text-secondary outline-none focus:border-accent-mid transition-obsidian"
          >
            <option value="">Tutte le fonti</option>
            {sources.map(s => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>

          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2 rounded-btn bg-bg-surface border border-bg-elevated text-sm text-text-secondary outline-none focus:border-accent-mid transition-obsidian"
          >
            <option value="">Tutti i mesi</option>
            {allMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-btn bg-bg-surface border border-bg-elevated text-sm text-text-secondary outline-none focus:border-accent-mid transition-obsidian"
          >
            <option value="">Tutte le categorie</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <span className="text-xs text-text-muted font-mono ml-auto">
            {table.getFilteredRowModel().rows.length} righe
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-bg-surface border border-bg-elevated rounded-card overflow-hidden">
          <table className="w-full">
            <thead className="sticky top-0 bg-bg-surface z-10">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-bg-elevated">
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      className="text-left py-2.5 px-4 section-label font-normal cursor-pointer select-none hover:text-text-secondary transition-obsidian"
                      style={{ width: header.getSize() }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown size={10} className="opacity-40" />
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-bg-elevated last:border-none hover:bg-bg-elevated/50 transition-obsidian"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="py-2 px-4" style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {data.length === 0 && (
            <div className="py-16 text-center text-text-muted text-sm">
              Nessuna transazione. Importa i dati dalla pagina Import.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
