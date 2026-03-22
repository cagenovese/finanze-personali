import { useEffect, useState } from 'react'
import {
  getSplitwiseExpenses,
  getSplitwiseBalances,
  type SplitwiseExpense,
} from '@/lib/ipc'

const USER_NAME = 'Carlo Alberto Genovese'

export default function Splitwise() {
  const [expenses, setExpenses] = useState<SplitwiseExpense[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})

  useEffect(() => {
    getSplitwiseExpenses().then(setExpenses)
    getSplitwiseBalances().then(setBalances)
  }, [])

  const userBalance = balances[USER_NAME] ?? 0
  const people = Object.entries(balances)
    .filter(([name]) => name !== USER_NAME)
    .sort((a, b) => a[1] - b[1])

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-1">SPESE CONDIVISE</p>
        <h1 className="text-2xl font-sans text-text-primary">Splitwise</h1>
      </div>

      {/* User balance summary */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">IL TUO BILANCIO</p>
          <p className={`font-mono text-xl ${userBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
            {userBalance >= 0 ? '+' : ''}{userBalance.toFixed(2)} €
          </p>
          <p className="text-text-muted text-xs mt-1">
            {userBalance >= 0 ? 'Ti devono' : 'Devi'} {Math.abs(userBalance).toFixed(2)} €
          </p>
        </div>
        <div className="flex-1 p-4 rounded-card bg-bg-surface border border-bg-elevated">
          <p className="section-label mb-1">SPESE TOTALI</p>
          <p className="font-mono text-xl text-text-primary">
            {expenses.reduce((s, e) => s + e.total_cost, 0).toFixed(2)} €
          </p>
          <p className="text-text-muted text-xs mt-1">{expenses.length} spese</p>
        </div>
      </div>

      {/* Per-person balances */}
      {people.length > 0 && (
        <div className="mb-8">
          <p className="section-label mb-3">BILANCI PER PERSONA</p>
          <div className="space-y-2">
            {people.map(([name, amount]) => {
              // From user's perspective: if person has negative balance, user owes them
              // if person has positive balance, they owe user
              // But balances are from each person's perspective, so we look at user's relation
              const relation = -amount // what user owes/is owed relative to this person
              return (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 rounded-card bg-bg-surface border border-bg-elevated"
                >
                  <span className="text-sm text-text-primary">{name}</span>
                  <div className="text-right">
                    <span className={`font-mono text-sm ${amount >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {amount >= 0 ? '+' : ''}{amount.toFixed(2)} €
                    </span>
                    <p className="text-text-muted text-xs">
                      {amount >= 0 ? 'ti deve' : 'devi'}  {Math.abs(amount).toFixed(2)} €
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expenses table */}
      <p className="section-label mb-3">SPESE</p>
      {expenses.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8">
          Nessuna spesa Splitwise importata.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-elevated text-text-muted text-left">
                <th className="py-2 pr-4 font-medium">Data</th>
                <th className="py-2 pr-4 font-medium">Descrizione</th>
                <th className="py-2 pr-4 font-medium">Categoria</th>
                <th className="py-2 pr-4 font-medium text-right">Totale</th>
                <th className="py-2 font-medium text-right">Tuo saldo</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => {
                const myShare = exp.balances[USER_NAME] ?? 0
                return (
                  <tr key={exp.id} className="border-b border-bg-elevated/50 hover:bg-bg-surface transition-obsidian">
                    <td className="py-2 pr-4 font-mono text-text-secondary">{exp.date}</td>
                    <td className="py-2 pr-4 text-text-primary">{exp.description}</td>
                    <td className="py-2 pr-4 text-text-muted">{exp.category ?? '—'}</td>
                    <td className="py-2 pr-4 font-mono text-text-secondary text-right">
                      {exp.total_cost.toFixed(2)} €
                    </td>
                    <td className={`py-2 font-mono text-right ${myShare >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {myShare >= 0 ? '+' : ''}{myShare.toFixed(2)} €
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
