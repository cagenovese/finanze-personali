import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import {
  getAvailableYears,
  getAnnualTrend,
  type MonthlyTrend,
} from '@/lib/ipc'

const MONTH_SHORT: Record<string, string> = {
  '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'Mag', '06': 'Giu', '07': 'Lug', '08': 'Ago',
  '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic',
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1E2130',
  border: '1px solid #252840',
  borderRadius: 8,
  color: '#E2E4F0',
  fontSize: 12,
}

export default function Dashboard() {
  const [year, setYear] = useState('')
  const [years, setYears] = useState<string[]>([])
  const [trend, setTrend] = useState<MonthlyTrend[]>([])

  useEffect(() => {
    getAvailableYears().then(y => {
      setYears(y)
      if (y.length > 0) setYear(y[0])
    })
  }, [])

  const reload = useCallback(async () => {
    if (!year) return
    const data = await getAnnualTrend(year)
    setTrend(data)
  }, [year])

  useEffect(() => { reload() }, [reload])

  const chartData = trend.map(t => ({
    ...t,
    label: MONTH_SHORT[t.month.slice(5)] ?? t.month.slice(5),
  }))

  const totalIncome = trend.reduce((s, t) => s + t.income, 0)
  const totalSpent = trend.reduce((s, t) => s + t.spent, 0)
  const totalSaved = totalIncome - totalSpent
  const avgMonthlySpent = trend.length > 0 ? totalSpent / trend.length : 0
  const topMonth = [...trend].sort((a, b) => b.spent - a.spent)[0]

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-label mb-1">OVERVIEW</p>
          <h1 className="text-2xl font-sans text-text-primary">Dashboard</h1>
        </div>
        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="px-3 py-2 rounded-btn bg-bg-surface border border-bg-elevated text-sm text-text-secondary outline-none focus:border-accent-mid transition-obsidian"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">ENTRATE TOTALI</p>
          <p className="font-mono text-lg text-positive">{totalIncome.toFixed(2)} €</p>
        </div>
        <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">SPESE TOTALI</p>
          <p className="font-mono text-lg text-negative">{totalSpent.toFixed(2)} €</p>
        </div>
        <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">RISPARMIO ANNUALE</p>
          <p className={`font-mono text-lg ${totalSaved >= 0 ? 'text-positive' : 'text-negative'}`}>
            {totalSaved.toFixed(2)} €
          </p>
        </div>
        <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">MEDIA MENSILE</p>
          <p className="font-mono text-lg text-text-primary">{avgMonthlySpent.toFixed(2)} €</p>
        </div>
      </div>

      {/* Risparmio mensile bar chart */}
      <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated mb-6">
        <p className="section-label mb-4">RISPARMIO MENSILE</p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={24}>
              <CartesianGrid vertical={false} stroke="#1E2130" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8B8FA8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8B8FA8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [`${v.toFixed(2)} €`, 'Risparmio']}
              />
              <ReferenceLine y={0} stroke="#252840" />
              <Bar dataKey="saved" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.saved >= 0 ? '#4ADE80' : '#F87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-muted text-sm text-center py-16">Nessun dato</p>
        )}
      </div>

      {/* Spese vs Entrate bar chart */}
      <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated mb-6">
        <p className="section-label mb-4">ENTRATE VS SPESE</p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={18} barGap={4}>
              <CartesianGrid vertical={false} stroke="#1E2130" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8B8FA8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8B8FA8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [`${v.toFixed(2)} €`, '']}
              />
              <Bar dataKey="income" name="Entrate" fill="#4ADE80" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spent" name="Spese" fill="#F87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-muted text-sm text-center py-16">Nessun dato</p>
        )}
      </div>

      {/* Stats row */}
      {topMonth && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
            <p className="section-label mb-1">MESE PIÙ COSTOSO</p>
            <p className="text-text-primary font-medium">
              {MONTH_SHORT[topMonth.month.slice(5)] ?? topMonth.month}
            </p>
            <p className="font-mono text-sm text-negative mt-1">{topMonth.spent.toFixed(2)} €</p>
          </div>
          <div className="p-4 rounded-card bg-bg-surface border border-bg-elevated">
            <p className="section-label mb-1">MESI CON RISPARMIO POSITIVO</p>
            <p className="font-mono text-xl text-positive">
              {trend.filter(t => t.saved > 0).length} / {trend.length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
