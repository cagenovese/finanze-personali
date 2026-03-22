import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import Papa from 'papaparse'
import { ParsedTransaction, txHash } from './types'

/**
 * Revolut CSV format:
 *   Separator: comma
 *   Columns (Italian labels): Tipo, Prodotto, Data di inizio, Data di completamento,
 *            Descrizione, Importo, Costo, Valuta, State, Saldo
 *   Date: YYYY-MM-DD HH:MM:SS
 *   Amount: period decimal, negative = expense
 *   Filter: only COMPLETATO rows
 */

interface RevolutRow {
  'Tipo': string
  'Prodotto': string
  'Data di inizio': string
  'Data di completamento': string
  'Descrizione': string
  'Importo': string
  'Costo': string
  'Valuta': string
  'State': string
  'Saldo': string
}

export function parseRevolutFile(filePath: string): ParsedTransaction[] {
  const content = readFileSync(filePath, 'utf-8')
  const { data } = Papa.parse<RevolutRow>(content, { header: true, skipEmptyLines: true })

  return data
    .filter(row => row['Descrizione'] && row['Importo'] && row['State'] === 'COMPLETATO')
    .map(row => {
      // Extract date part only (YYYY-MM-DD) from "YYYY-MM-DD HH:MM:SS"
      const dateRaw = (row['Data di completamento'] || row['Data di inizio']).trim()
      const date = dateRaw.slice(0, 10)
      const description = row['Descrizione'].trim()
      const amount = parseFloat(row['Importo'])
      const currency = (row['Valuta'] || 'EUR').trim()

      return {
        hash: txHash('revolut', date, description, amount),
        date,
        description,
        amount,
        currency,
        source: 'revolut',
      }
    })
}

export function parseRevolutFolder(folderPath: string): { fileName: string; transactions: ParsedTransaction[] }[] {
  const files = readdirSync(folderPath).filter(f => f.endsWith('.csv'))
  return files.map(f => ({
    fileName: f,
    transactions: parseRevolutFile(join(folderPath, f)),
  }))
}
