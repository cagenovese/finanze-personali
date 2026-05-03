import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import Papa from 'papaparse'
import { ParsedTransaction, txHash, parseEuropeanAmount } from './types'

/**
 * American Express CSV format:
 *   Separator: comma
 *   Columns (German labels): Datum, Beschreibung, Betrag
 *   Date: DD/MM/YYYY
 *   Amount: comma decimal, quoted (e.g. "9,00"). Positive = charge, negative = refund.
 *   We negate because in our schema negative = expense.
 */

interface AmexRow {
  'Datum': string
  'Beschreibung': string
  'Betrag': string
}

function parseDMYSlashDate(dmy: string): string {
  // "08/01/2026" → "2026-01-08"
  const [d, m, y] = dmy.trim().split('/')
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export function parseAmexFile(filePath: string): ParsedTransaction[] {
  const content = readFileSync(filePath, 'utf-8')
  const { data } = Papa.parse<AmexRow>(content, { header: true, skipEmptyLines: true })

  return data
    .filter(row => row['Datum'] && row['Betrag'])
    // Skip credit card bill payments (internal transfers, not real income)
    .filter(row => !row['Beschreibung']?.includes('ZAHLUNG/ÜBERWEISUNG'))
    .map(row => {
      const date = parseDMYSlashDate(row['Datum'])
      const description = row['Beschreibung'].trim()
      // AMEX: positive Betrag = charge (expense) → negate to -
      // AMEX: negative Betrag = refund → negate to +
      const rawAmount = parseEuropeanAmount(row['Betrag'])
      const amount = -rawAmount

      return {
        hash: txHash('amex', date, description, amount),
        date,
        description,
        amount,
        currency: 'EUR',
        source: 'amex',
      }
    })
}

export function parseAmexFolder(folderPath: string): { fileName: string; transactions: ParsedTransaction[] }[] {
  const files = readdirSync(folderPath).filter(f => f.endsWith('.csv'))
  return files.map(f => ({
    fileName: f,
    transactions: parseAmexFile(join(folderPath, f)),
  }))
}
