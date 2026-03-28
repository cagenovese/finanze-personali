import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, Search, Sparkles, X, Plus, MoreVertical, Scissors } from 'lucide-react'
import {
  getTransactions,
  getCategories,
  updateTransaction,
  runCategorization,
  addManualTransaction,
  splitTransaction,
  type Transaction,
  type Category,
} from '@/lib/ipc'

// ── Row menu ──────────────────────────────────────────

function RowMenu({
  tx,
  onSplit,
}: {
  tx: Transaction
  onSplit: (tx: Transaction) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 flex items-center justify-center rounded-chip text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-obsidian"
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-40 bg-bg-overlay border border-bg-elevated rounded-card shadow-lg py-1">
          <button
            disabled={tx.is_split === 1}
            onClick={() => { setOpen(false); onSplit(tx) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-obsidian disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Scissors size={13} />
            Suddividi
          </button>
        </div>
      )}
    </div>
  )
}

// ── Add manual modal ──────────────────────────────────

function AddModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = date && description.trim() && amount && !isNaN(parseFloat(amount))

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    await addManualTransaction({
      date,
      description: description.trim(),
      amount: parseFloat(amount),
      category: category || null,
      notes: notes.trim() || null,
    })
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-surface border border-bg-elevated rounded-card p-6 w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium text-text-primary">Aggiungi transazione</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-obsidian">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label mb-1 block">DATA</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-btn bg-bg-elevated border border-bg-elevated text-sm text-text-primary outline-none focus:border-accent-mid transition-obsidian"
              />
            </div>
            <div>
              <label className="section-label mb-1 block">IMPORTO (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="-50.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-btn bg-bg-elevated border border-bg-elevated text-sm text-text-primary font-mono outline-none focus:border-accent-mid transition-obsidian"
              />
            </div>
          </div>

          <div>
            <label className="section-label mb-1 block">DESCRIZIONE</label>
            <input
              type="text"
              placeholder="Es. Spesa al mercato"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-btn bg-bg-elevated border border-bg-elevated text-sm text-text-primary outline-none focus:border-accent-mid transition-obsidian"
            />
          </div>

          <div>
            <label className="section-label mb-1 block">CATEGORIA</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-btn bg-bg-elevated border border-bg-elevated text-sm text-text-secondary outline-none focus:border-accent-mid transition-obsidian"
            >
              <option value="">— Nessuna —</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="section-label mb-1 block">NOTE</label>
            <input
              type="text"
              placeholder="Opzionale"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-btn bg-bg-elevated border border-bg-elevated text-sm text-text-primary outline-none focus:border-accent-mid transition-obsidian"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-btn text-sm text-text-muted hover:text-text-secondary transition-obsidian"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-4 py-2 rounded-btn bg-accent-base text-bg-base text-sm font-medium transition-obsidian hover:bg-accent-bright disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Split modal ───────────────────────────────────────

interface SplitItem {
  description: string
  amount: string
  category: string
}

function SplitModal({
  tx,
  categories,
  onClose,
  onSaved,
}: {
  tx: Transaction
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const total = Math.abs(tx.amount)
  const sign = tx.amount < 0 ? -1 : 1
  const [items, setItems] = useState<SplitItem[]>([
    { description: '', amount: '', category: '' },
    { description: '', amount: '', category: '' },
  ])
  const [saving, setSaving] = useState(false)

  const allocated = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const remaining = parseFloat((total - allocated).toFixed(2))
  const canSave = remaining === 0 && items.every(i => i.description.trim() && parseFloat(i.amount) > 0)

  const updateItem = (idx: number, field: keyof SplitItem, value: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const addItem = () => setItems(prev => [...prev, { description: '', amount: '', category: '' }])
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    await splitTransaction(
      tx.id,
      items.map(i => ({
        description: i.description.trim(),
        amount: sign * parseFloat(i.amount),
        category: i.category || null,
      }))
    )
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-surface border border-bg-elevated rounded-card p-6 w-full max-w-lg shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-medium text-text-primary">Suddividi transazione</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-obsidian">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-text-muted mb-4">
          <span className="font-mono text-text-secondary">{tx.description}</span>
          {' · '}
          <span className="font-mono text-negative">{total.toFixed(2)} €</span>
        </p>

        <div className="space-y-2 mb-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Descrizione"
                value={item.description}
                onChange={e => updateItem(idx, 'description', e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-btn bg-bg-elevated border border-bg-elevated text-sm text-text-primary outline-none focus:border-accent-mid transition-obsidian"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={item.amount}
                onChange={e => updateItem(idx, 'amount', e.target.value)}
                className="w-24 px-3 py-1.5 rounded-btn bg-bg-elevated border border-bg-elevated text-sm text-text-primary font-mono text-right outline-none focus:border-accent-mid transition-obsidian"
              />
              <select
                value={item.category}
                onChange={e => updateItem(idx, 'category', e.target.value)}
                className="w-36 px-2 py-1.5 rounded-btn bg-bg-elevated border border-bg-elevated text-sm text-text-secondary outline-none focus:border-accent-mid transition-obsidian"
              >
                <option value="">Nessuna</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              {items.length > 2 && (
                <button
                  onClick={() => removeItem(idx)}
                  className="text-text-muted hover:text-negative transition-obsidian"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          className="flex items-center gap-1 text-xs text-accent-base hover:text-accent-bright transition-obsidian mb-4"
        >
          <Plus size={12} /> Aggiungi voce
        </button>

        {/* Remaining */}
        <div className={`text-sm font-mono mb-5 ${remaining === 0 ? 'text-positive' : remaining < 0 ? 'text-negative' : 'text-text-muted'}`}>
          {remaining === 0 ? '✓ Totale corretto' : `Rimanente: ${remaining.toFixed(2)} €`}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-btn text-sm text-text-muted hover:text-text-secondary transition-obsidian"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-4 py-2 rounded-btn bg-accent-base text-bg-base text-sm font-medium transition-obsidian hover:bg-accent-bright disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suddividi
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────

export default function Transactions() {
  const [data, setData] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [splitTarget, setSplitTarget] = useState<Transaction | null>(null)

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
        cell: ({ row, getValue }) => {
          const tx = row.original
          return (
            <span className="text-sm text-text-primary truncate flex items-center gap-2 max-w-[300px]" title={getValue<string>()}>
              {getValue<string>()}
              {tx.is_split === 1 && (
                <span className="text-[10px] font-mono text-text-muted bg-bg-elevated px-1.5 py-0.5 rounded-chip flex-shrink-0">
                  suddiviso
                </span>
              )}
              {tx.split_from != null && (
                <span className="text-[10px] font-mono text-accent-base bg-accent-base/10 px-1.5 py-0.5 rounded-chip flex-shrink-0">
                  split
                </span>
              )}
            </span>
          )
        },
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
              {val >= 0 ? '+' : ''}{val.toFixed(2)} €
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
        header: 'Nec./Reg.',
        size: 72,
        cell: ({ row }) => {
          const tx = row.original
          const val = tx.is_necessary
          const isIncome = tx.amount > 0

          const label = isIncome
            ? (val === 1 ? 'R' : val === 0 ? 'I' : '·')
            : (val === 1 ? 'S' : val === 0 ? 'N' : '·')

          const title = isIncome
            ? (val === 1 ? 'Regolare' : val === 0 ? 'Irregolare' : 'Non classificata')
            : (val === 1 ? 'Necessaria' : val === 0 ? 'Non necessaria' : 'Non classificata')

          return (
            <button
              onClick={() => {
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
              title={title}
            >
              {label}
            </button>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        size: 48,
        cell: ({ row }) => (
          <RowMenu tx={row.original} onSplit={setSplitTarget} />
        ),
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-bg-surface border border-bg-elevated text-text-secondary text-sm font-sans transition-obsidian hover:border-accent-mid hover:text-text-primary"
            >
              <Plus size={15} />
              Aggiungi
            </button>
            <button
              onClick={handleCategorize}
              className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-accent-base text-bg-base font-sans text-sm font-medium transition-obsidian hover:bg-accent-bright active:scale-[0.98]"
            >
              <Sparkles size={16} />
              Auto-categorizza
            </button>
          </div>
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
                        {header.column.columnDef.header !== '' && (
                          <ArrowUpDown size={10} className="opacity-40" />
                        )}
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
                  className={`border-b border-bg-elevated last:border-none hover:bg-bg-elevated/50 transition-obsidian ${
                    row.original.is_split === 1 ? 'opacity-50' : ''
                  }`}
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

      {/* Modals */}
      {showAddModal && (
        <AddModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSaved={reload}
        />
      )}
      {splitTarget && (
        <SplitModal
          tx={splitTarget}
          categories={categories}
          onClose={() => setSplitTarget(null)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
