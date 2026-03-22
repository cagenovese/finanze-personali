import { existsSync } from 'fs'
import { parseN26Folder } from './n26'
import { parseRevolutFolder } from './revolut'
import { parseCommerzbankFolder } from './commerzbank'
import { parseAmexFolder } from './amex'
import { parseTradeRepublicFolder } from './traderepublic'
import { parseSplitwiseFolder } from './splitwise'
import { insertTransaction, insertSplitwiseExpense, logImport } from '../db'
import type { ImportSourceResult } from './types'

export type SourceId = 'n26' | 'revolut' | 'commerzbank' | 'amex' | 'traderepublic' | 'splitwise'

const SOURCE_CONFIG: Record<SourceId, { label: string; defaultPath: string }> = {
  n26:            { label: 'N26',             defaultPath: '/Users/carloalbertogenovese/Documents/SOLDI/csvN26' },
  revolut:        { label: 'Revolut',         defaultPath: '/Users/carloalbertogenovese/Documents/SOLDI/csvRevolut' },
  commerzbank:    { label: 'Commerzbank',     defaultPath: '/Users/carloalbertogenovese/Documents/SOLDI/csvCommerzbank' },
  amex:           { label: 'American Express', defaultPath: '/Users/carloalbertogenovese/Documents/SOLDI/csvAmex' },
  traderepublic:  { label: 'Trade Republic',  defaultPath: '/Users/carloalbertogenovese/Documents/SOLDI/csvTradeRepublic' },
  splitwise:      { label: 'Splitwise',       defaultPath: '/Users/carloalbertogenovese/Documents/SOLDI/csvSplitwise' },
}

export function getSourceConfig() {
  return SOURCE_CONFIG
}

export async function importSource(sourceId: SourceId): Promise<ImportSourceResult> {
  const config = SOURCE_CONFIG[sourceId]
  if (!config) throw new Error(`Unknown source: ${sourceId}`)

  const folderPath = config.defaultPath
  if (!existsSync(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`)
  }

  const result: ImportSourceResult = {
    source: sourceId,
    files: [],
    totalImported: 0,
    totalSkipped: 0,
  }

  if (sourceId === 'splitwise') {
    const parsed = parseSplitwiseFolder(folderPath)
    for (const { fileName, expenses } of parsed) {
      let imported = 0
      let skipped = 0
      for (const exp of expenses) {
        const inserted = insertSplitwiseExpense(exp)
        if (inserted) imported++
        else skipped++
      }
      logImport(sourceId, fileName, imported, skipped)
      result.files.push({ fileName, imported, skipped })
      result.totalImported += imported
      result.totalSkipped += skipped
    }
    return result
  }

  if (sourceId === 'traderepublic') {
    const parsed = await parseTradeRepublicFolder(folderPath)
    for (const { fileName, transactions } of parsed) {
      let imported = 0
      let skipped = 0
      for (const tx of transactions) {
        const inserted = insertTransaction(tx)
        if (inserted) imported++
        else skipped++
      }
      logImport(sourceId, fileName, imported, skipped)
      result.files.push({ fileName, imported, skipped })
      result.totalImported += imported
      result.totalSkipped += skipped
    }
    return result
  }

  // CSV sources
  const parseFolderFn = {
    n26: parseN26Folder,
    revolut: parseRevolutFolder,
    commerzbank: parseCommerzbankFolder,
    amex: parseAmexFolder,
  }[sourceId]!

  const parsed = parseFolderFn(folderPath)
  for (const { fileName, transactions } of parsed) {
    let imported = 0
    let skipped = 0
    for (const tx of transactions) {
      const inserted = insertTransaction(tx)
      if (inserted) imported++
      else skipped++
    }
    logImport(sourceId, fileName, imported, skipped)
    result.files.push({ fileName, imported, skipped })
    result.totalImported += imported
    result.totalSkipped += skipped
  }

  return result
}
