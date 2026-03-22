import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import Papa from 'papaparse'
import { ParsedTransaction, txHash, parseEuropeanAmount } from './types'

/**
 * Commerzbank CSV format:
 *   Separator: semicolon (;)
 *   Columns: Booking date, Value date, Transaction type, Booking text,
 *            Amount, Currency, Account IBAN, Category
 *   Date: DD.MM.YYYY
 *   Amount: comma decimal (e.g. "4,90", "-12,50", "200")
 */

interface CommerzbankRow {
  'Booking date': string
  'Value date': string
  'Transaction type': string
  'Booking text': string
  'Amount': string
  'Currency': string
  'Account IBAN': string
  'Category': string
}

function parseDMYDate(dmy: string): string {
  // "02.01.2026" → "2026-01-02"
  const [d, m, y] = dmy.trim().split('.')
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export function parseCommerzbankFile(filePath: string): ParsedTransaction[] {
  const content = readFileSync(filePath, 'utf-8')
  const { data } = Papa.parse<CommerzbankRow>(content, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
  })

  return data
    .filter(row => row['Booking date'] && row['Amount'])
    .map(row => {
      const date = parseDMYDate(row['Booking date'])
      const description = row['Booking text'].trim()
      const amount = parseEuropeanAmount(row['Amount'])
      const currency = (row['Currency'] || 'EUR').trim()

      return {
        hash: txHash('commerzbank', date, description, amount),
        date,
        description,
        amount,
        currency,
        source: 'commerzbank',
      }
    })
}

export function parseCommerzbankFolder(folderPath: string): { fileName: string; transactions: ParsedTransaction[] }[] {
  const files = readdirSync(folderPath).filter(f => f.endsWith('.csv'))
  return files.map(f => ({
    fileName: f,
    transactions: parseCommerzbankFile(join(folderPath, f)),
  }))
}
