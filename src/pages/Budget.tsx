import { useEffect, useState, useCallback } from 'react'
import {
  getBudgets,
  setBudget,
  getSpending,
  getCategories,
  getAvailableMonths,
  type Category,
  type BudgetEntry,
  type SpendingEntry,
} from '@/lib/ipc'

interface CategoryBudget {
  category: string
  budget: number
  spent: number
}

export default function Budget() {
  const [month, setMonth] = useState('')
  const [months, setMonths] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [rows, setRows] = useState<CategoryBudget[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    getAvailableMonths().then(m => {
      setMonths(m)
      if (m.length > 0 && !month) setMonth(m[0])
    })
    getCategories().then(setCategories)
  }, [])

  const reload = useCallback(async () => {
    if (!month) return
    const [budgets, spending] = await Promise.all([getBudgets(month), getSpending(month)])

    const budgetMap = new Map(budgets.map(b => [b.category, b.budget]))
    const spentMap = new Map(spending.map(s => [s.category, s.spent]))

    const merged: CategoryBudget[] = categories
      .filter(c => c.name !== 'Altro')
      .map(c => ({
        category: c.name,
        budget: budgetMap.get(c.name) ?? 0,
        spent: spentMap.get(c.name) ?? 0,
      }))

    setRows(merged)
  }, [month, categories])

  useEffect(() => { reload() }, [reload])

  const handleSetBudget = useCallback(async (category: string, value: string) => {
    const amount = parseFloat(value)
    if (isNaN(amount) || amount < 0) return
    await setBudget(category, month, amount)
    setEditingId(null)
    reload()
  }, [month, reload])

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">PIANIFICAZIONE</p>
          <h1 className="text-2xl font-sans text-text-primary">Budget</h1>
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 rounded-btn bg-bg-surface border border-bg-elevated text-sm text-text-secondary outline-none focus:border-accent-mid transition-obsidian"
        >
          {months.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">BUDGET TOTALE</p>
          <p className="font-mono text-xl text-text-primary">{totalBudget.toFixed(2)} €</p>
        </div>
        <div className="flex-1 p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">SPESO</p>
          <p className={`font-mono text-xl ${totalSpent > totalBudget && totalBudget > 0 ? 'text-negative' : 'text-text-primary'}`}>
            {totalSpent.toFixed(2)} €
          </p>
        </div>
        <div className="flex-1 p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">RIMANENTE</p>
          <p className={`font-mono text-xl ${totalBudget - totalSpent < 0 ? 'text-negative' : 'text-positive'}`}>
            {(totalBudget - totalSpent).toFixed(2)} €
          </p>
        </div>
      </div>

      {/* Category rows */}
      <div className="space-y-3">
        {rows.map(row => {
          const pct = row.budget > 0 ? Math.min((row.spent / row.budget) * 100, 100) : 0
          const isOver = row.budget > 0 && row.spent > row.budget
          const isEditing = editingId === row.category

          return (
            <div
              key={row.category}
              className="p-4 rounded-card bg-bg-surface border border-bg-elevated"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-primary font-medium">{row.category}</span>
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-sm ${isOver ? 'text-negative' : 'text-text-secondary'}`}>
                    {row.spent.toFixed(2)} €
                  </span>
                  <span className="text-text-muted">/</span>
                  {isEditing ? (
                    <input
                      autoFocus
                      type="number"
                      step="10"
                      min="0"
                      className="w-24 bg-bg-elevated text-text-primary text-sm font-mono rounded-chip px-2 py-1 border border-accent-mid outline-none text-right"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => handleSetBudget(row.category, editValue)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSetBudget(row.category, editValue)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => { setEditingId(row.category); setEditValue(String(row.budget)) }}
                      className="font-mono text-sm text-accent-base hover:text-accent-bright transition-obsidian"
                    >
                      {row.budget > 0 ? `${row.budget.toFixed(2)} €` : 'imposta'}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-bg-elevated overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOver ? 'bg-negative' : 'bg-gradient-to-r from-accent-mid to-accent-base'
                  }`}
                  style={{ width: `${row.budget > 0 ? pct : 0}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {rows.length === 0 && month && (
        <p className="text-text-muted text-sm text-center py-8">
          Nessuna categoria trovata. Importa transazioni e auto-categorizza prima.
        </p>
      )}
    </div>
  )
}
