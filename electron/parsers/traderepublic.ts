import { readdirSync } from 'fs'
import { join } from 'path'
import { ParsedTransaction, txHash, parseEuropeanAmount } from './types'

/**
 * Trade Republic PDF format (monthly statement):
 *   Section "UMSATZÜBERSICHT" contains transactions.
 *   Columns: DATUM, TYP, BESCHREIBUNG, ZAHLUNGSEINGANG, ZAHLUNGSAUSGANG, SALDO
 *   Date: "11 Dez. 2025" (German month abbreviations)
 *   Amounts: European format with € symbol (e.g. "14,97 €")
 *
 *   Uses pdfjs-dist to extract text, then regex to parse the UMSATZÜBERSICHT table.
 */

const MONTH_MAP: Record<string, string> = {
  'Jan': '01', 'Feb': '02', 'Mär': '03', 'Apr': '04',
  'Mai': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
  'Sep': '09', 'Okt': '10', 'Nov': '11', 'Dez': '12',
}

function parseGermanDate(dateStr: string): string {
  // "11 Dez. 2025" → "2025-12-11"
  const match = dateStr.match(/(\d{1,2})\s+(\w{3})\.?\s+(\d{4})/)
  if (!match) return ''
  const [, day, monthAbbr, year] = match
  const month = MONTH_MAP[monthAbbr] || '01'
  return `${year}-${month}-${day.padStart(2, '0')}`
}

function parseAmountWithEuro(s: string): number {
  // "14,97 €" → 14.97, also handles "0,00 €"
  const cleaned = s.replace(/€/g, '').trim()
  if (!cleaned || cleaned === '') return 0
  return parseEuropeanAmount(cleaned)
}

export async function parseTradeRepublicFile(filePath: string): Promise<ParsedTransaction[]> {
  // Dynamic import pdfjs-dist (ESM-only in newer versions)
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const doc = await getDocument(filePath).promise
  let fullText = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const items = content.items as Array<{ str: string; transform: number[] }>

    // Reconstruct text with position awareness
    // Group items by Y position to form lines
    const lines = new Map<number, { x: number; str: string }[]>()
    for (const item of items) {
      const y = Math.round(item.transform[5]) // Y position
      const x = item.transform[4]             // X position
      if (!lines.has(y)) lines.set(y, [])
      lines.get(y)!.push({ x, str: item.str })
    }

    // Sort lines by Y (descending = top to bottom in PDF coords) then items by X
    const sortedY = [...lines.keys()].sort((a, b) => b - a)
    for (const y of sortedY) {
      const lineItems = lines.get(y)!.sort((a, b) => a.x - b.x)
      fullText += lineItems.map(i => i.str).join('\t') + '\n'
    }
  }

  // Extract the UMSATZÜBERSICHT section
  const transactions: ParsedTransaction[] = []
  const lines = fullText.split('\n')

  let inSection = false
  for (const line of lines) {
    // Detect section start
    if (line.includes('UMSATZÜBERSICHT')) {
      inSection = true
      continue
    }
    // Detect section end (next section starts)
    if (inSection && (line.includes('BARMITTELÜBERSICHT') || line.includes('HINWEISE'))) {
      break
    }
    // Skip header row
    if (line.includes('DATUM') && line.includes('TYP')) continue

    if (!inSection) continue

    // Try to match a transaction line
    // Pattern: date + type + description + amounts
    const dateMatch = line.match(/(\d{1,2}\s+\w{3}\.?\s+\d{4})/)
    if (!dateMatch) continue

    const date = parseGermanDate(dateMatch[1])
    if (!date) continue

    // Extract amounts: look for patterns like "14,97 €" or "0,00 €"
    const amountMatches = [...line.matchAll(/([\d.,]+)\s*€/g)]
    if (amountMatches.length === 0) continue

    // Extract description — text between date/type and amounts
    // Find the type (Ertrag, Überweisung, Zahlung, etc.)
    const afterDate = line.slice(line.indexOf(dateMatch[0]) + dateMatch[0].length)
    const parts = afterDate.split('\t').map(s => s.trim()).filter(Boolean)

    const type = parts[0] || ''
    const description = parts[1] || parts[0] || 'Trade Republic'

    // Determine income vs expense:
    // ZAHLUNGSEINGANG (income) is typically 4th column, ZAHLUNGSAUSGANG (expense) is 5th
    // If there are 3 amounts: [income, expense, saldo]
    // If there are 2 amounts: one of income/expense is empty, other + saldo
    let amount = 0
    if (amountMatches.length >= 3) {
      const income = parseAmountWithEuro(amountMatches[0][0])
      const expense = parseAmountWithEuro(amountMatches[1][0])
      amount = income > 0 ? income : -expense
    } else if (amountMatches.length === 2) {
      // Only one amount + saldo — check position or if it's in income/expense column
      const val = parseAmountWithEuro(amountMatches[0][0])
      // Trade Republic: dividends are ZAHLUNGSEINGANG (income)
      // Payments out are ZAHLUNGSAUSGANG (expense)
      if (type.includes('Ertrag') || type.includes('Dividend')) {
        amount = val
      } else {
        amount = -val
      }
    }

    if (amount === 0) continue

    transactions.push({
      hash: txHash('traderepublic', date, description, amount),
      date,
      description: `${type}: ${description}`.trim(),
      amount,
      currency: 'EUR',
      source: 'traderepublic',
    })
  }

  return transactions
}

export async function parseTradeRepublicFolder(
  folderPath: string
): Promise<{ fileName: string; transactions: ParsedTransaction[] }[]> {
  const files = readdirSync(folderPath).filter(f => f.endsWith('.pdf'))
  const results = []
  for (const f of files) {
    const transactions = await parseTradeRepublicFile(join(folderPath, f))
    results.push({ fileName: f, transactions })
  }
  return results
}
