import { readFileSync, readdirSync } from 'fs'
import { join, basename } from 'path'
import Papa from 'papaparse'
import { ParsedTransaction, txHash } from './types'

/**
 * N26 CSV format:
 *   Separator: comma
 *   Columns: Booking Date, Value Date, Partner Name, Partner Iban, Type,
 *            Payment Reference, Account Name, Amount (EUR), Original Amount,
 *            Original Currency, Exchange Rate
 *   Date: YYYY-MM-DD
 *   Amount: period decimal, negative = expense
 */

interface N26Row {
  'Booking Date': string
  'Value Date': string
  'Partner Name': string
  'Partner Iban': string
  'Type': string
  'Payment Reference': string
  'Account Name': string
  'Amount (EUR)': string
  'Original Amount': string
  'Original Currency': string
  'Exchange Rate': string
}

export function parseN26File(filePath: string): ParsedTransaction[] {
  const content = readFileSync(filePath, 'utf-8')
  const { data } = Papa.parse<N26Row>(content, { header: true, skipEmptyLines: true })

  return data
    .filter(row => row['Booking Date'] && row['Amount (EUR)'])
    .map(row => {
      const date = row['Booking Date'].trim()
      const description = (row['Partner Name'] || row['Payment Reference'] || 'N26 Transaction').trim()
      const amount = parseFloat(row['Amount (EUR)'])

      return {
        hash: txHash('n26', date, description, amount),
        date,
        description,
        amount,
        currency: 'EUR',
        source: 'n26',
      }
    })
}

export function parseN26Folder(folderPath: string): { fileName: string; transactions: ParsedTransaction[] }[] {
  const files = readdirSync(folderPath).filter(f => f.endsWith('.csv'))
  return files.map(f => ({
    fileName: f,
    transactions: parseN26File(join(folderPath, f)),
  }))
}
