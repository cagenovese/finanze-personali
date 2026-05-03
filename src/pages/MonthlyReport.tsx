import { useEffect, useState, useCallback } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import {
  getAvailableMonths,
  getSpending,
  getMonthlyNecessary,
  type MonthlyNecessary,
  type SpendingEntry,
} from '@/lib/ipc'

const COLORS = [
  '#7C85D0', '#A78BFA', '#60A5FA', '#34D399', '#FBBF24',
  '#F87171', '#E879F9', '#38BDF8', '#4ADE80', '#FB923C',
  '#94A3B8', '#F472B6',
]

const TOOLTIP_STYLE = {
  backgroundColor: '#1E2130',
  border: '1px solid #252840',
  borderRadius: 8,
  color: '#E2E4F0',
  fontSize: 12,
}

export default function MonthlyReport() {
  const [month, setMonth] = useState('')
  const [months, setMonths] = useState<string[]>([])
  const [spending, setSpending] = useState<SpendingEntry[]>([])
  const [necessary, setNecessary] = useState<MonthlyNecessary>({ necessary: 0, unnecessary: 0, income: 0 })

  useEffect(() => {
    getAvailableMonths().then(m => {
      setMonths(m)
      if (m.length > 0) setMonth(m[0])
    })
  }, [])

  const reload = useCallback(async () => {
    if (!month) return
    const [sp, nec] = await Promise.all([
      getSpending(month),
      getMonthlyNecessary(month),
    ])
    setSpending(sp)
    setNecessary(nec)
  }, [month])

  useEffect(() => { reload() }, [reload])

  // Use the necessary+unnecessary buckets as totalSpent: getSpendingByCategory
  // excludes rows with category IS NULL, which would understate the total.
  const totalSpent = necessary.necessary + necessary.unnecessary
  const saved = necessary.income - totalSpent

  const categorizedSpent = spending.reduce((s, r) => s + r.spent, 0)
  const uncategorizedSpent = Math.max(0, totalSpent - categorizedSpent)
  const spendingForChart: SpendingEntry[] = uncategorizedSpent > 0.005
    ? [...spending, { category: 'Senza categoria', spent: uncategorizedSpent }]
    : spending

  const necessaryPie = [
    { name: 'Necessarie', value: necessary.necessary },
    { name: 'Non necessarie', value: necessary.unnecessary },
  ]

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">ANALISI</p>
          <h1 className="text-2xl font-sans text-text-primary">Report Mensile</h1>
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 rounded-btn bg-bg-surface border border-bg-elevated text-sm text-text-secondary outline-none focus:border-accent-mid transition-obsidian"
        >
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">ENTRATE</p>
          <p className="font-mono text-lg text-positive">{necessary.income.toFixed(2)} €</p>
        </div>
        <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">SPESE</p>
          <p className="font-mono text-lg text-negative">{totalSpent.toFixed(2)} €</p>
        </div>
        <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">RISPARMIO</p>
          <p className={`font-mono text-lg ${saved >= 0 ? 'text-positive' : 'text-negative'}`}>
            {saved.toFixed(2)} €
          </p>
        </div>
        <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">NECESSARIE</p>
          <p className="font-mono text-lg text-text-primary">
            {necessary.necessary > 0 || necessary.unnecessary > 0
              ? `${Math.round((necessary.necessary / (necessary.necessary + necessary.unnecessary)) * 100)}%`
              : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Pie chart — spese per categoria */}
        <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-4">SPESE PER CATEGORIA</p>
          {spendingForChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={spendingForChart}
                  dataKey="spent"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                >
                  {spendingForChart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [`${v.toFixed(2)} €`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-sm text-center py-16">Nessun dato</p>
          )}
        </div>

        {/* Pie chart — necessarie vs non */}
        <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-4">NECESSARIE VS NON NECESSARIE</p>
          {(necessary.necessary + necessary.unnecessary) > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={necessaryPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                >
                  <Cell fill="#4ADE80" />
                  <Cell fill="#F87171" />
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [`${v.toFixed(2)} €`, '']}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#8B8FA8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-sm text-center py-16">Nessun dato</p>
          )}
        </div>
      </div>

      {/* Category breakdown table */}
      {spendingForChart.length > 0 && (
        <>
          <p className="section-label mb-3">DETTAGLIO CATEGORIE</p>
          <div className="space-y-2">
            {[...spendingForChart].sort((a, b) => b.spent - a.spent).map((row, i) => {
              const pct = totalSpent > 0 ? (row.spent / totalSpent) * 100 : 0
              return (
                <div key={row.category} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-sm text-text-primary w-36 truncate">{row.category}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <span className="font-mono text-sm text-text-secondary w-24 text-right">
                    {row.spent.toFixed(2)} €
                  </span>
                  <span className="font-mono text-xs text-text-muted w-10 text-right">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
