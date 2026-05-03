import { createHash } from 'crypto'

/** A normalized transaction ready for DB insertion. */
export interface ParsedTransaction {
  hash: string
  date: string        // YYYY-MM-DD
  description: string
  amount: number      // negative = expense, positive = income
  currency: string
  source: string      // 'n26' | 'revolut' | 'commerzbank' | 'amex' | 'traderepublic'
  category?: string | null
}

/** A Splitwise expense with per-person balances. */
export interface ParsedSplitwiseExpense {
  hash: string
  date: string
  description: string
  category: string | null
  total_cost: number
  currency: string
  balances: Record<string, number>
}

/** Result returned after importing a single file. */
export interface ImportFileResult {
  fileName: string
  imported: number
  skipped: number
}

/** Result returned after importing all files from a source. */
export interface ImportSourceResult {
  source: string
  files: ImportFileResult[]
  totalImported: number
  totalSkipped: number
}

/**
 * Normalize a description for hash comparison: strip non-alphanumeric chars,
 * collapse spaces, lowercase. This prevents duplicates from encoding differences
 * (e.g. "D'AMPEZ" vs "DAMPEZ", "GENÈVE" vs "GEN√àVE").
 */
function normalizeDescription(s: string): string {
  return s.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Generate a deterministic hash for deduplication.
 * Based on source + date + normalized description + amount.
 */
export function txHash(source: string, date: string, description: string, amount: number): string {
  const raw = `${source.toLowerCase()}|${date}|${normalizeDescription(description)}|${amount.toFixed(2)}`
  return createHash('sha256').update(raw).digest('hex').slice(0, 16)
}

/**
 * Parse a European-format number string:  "1.234,56" → 1234.56, "9,00" → 9.00, "200" → 200
 */
export function parseEuropeanAmount(s: string): number {
  const cleaned = s.replace(/\s/g, '')       // strip whitespace
    .replace(/\./g, '')     // remove thousands separator (period)
    .replace(',', '.')       // decimal comma → period
  return parseFloat(cleaned)
}
