import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import Papa from 'papaparse'
import { ParsedSplitwiseExpense, txHash } from './types'

/**
 * Splitwise CSV format:
 *   Separator: comma
 *   Columns: Data, Descrizione, Categorie, Costo, Valuta, [Person1], [Person2], ...
 *   Date: YYYY-MM-DD
 *   Amount: period decimal
 *   Person columns are dynamic — positive = they owe, negative = they paid extra
 */

export function parseSplitwiseFile(filePath: string): ParsedSplitwiseExpense[] {
  const content = readFileSync(filePath, 'utf-8')
  const { data, meta } = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  })

  // Columns after "Valuta" are person names
  const fixedCols = ['Data', 'Descrizione', 'Categorie', 'Costo', 'Valuta']
  const personCols = (meta.fields ?? []).filter(f => !fixedCols.includes(f))

  return data
    .filter(row => row['Data'] && row['Costo'])
    .map(row => {
      const date = row['Data'].trim()
      const description = row['Descrizione'].trim()
      const category = row['Categorie']?.trim() || null
      const totalCost = parseFloat(row['Costo']) || 0
      const currency = (row['Valuta'] || 'EUR').trim()

      const balances: Record<string, number> = {}
      for (const person of personCols) {
        const val = parseFloat(row[person])
        if (!isNaN(val) && val !== 0) {
          balances[person] = val
        }
      }

      return {
        hash: txHash('splitwise', date, description, totalCost),
        date,
        description,
        category,
        total_cost: totalCost,
        currency,
        balances,
      }
    })
}

export function parseSplitwiseFolder(folderPath: string): { fileName: string; expenses: ParsedSplitwiseExpense[] }[] {
  const files = readdirSync(folderPath).filter(f => f.endsWith('.csv'))
  return files.map(f => ({
    fileName: f,
    expenses: parseSplitwiseFile(join(folderPath, f)),
  }))
}
