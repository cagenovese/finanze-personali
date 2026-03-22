import { getDb } from './db'

interface CategoryRow {
  id: number
  name: string
  keywords: string // JSON array
}

interface TransactionRow {
  id: number
  description: string
}

/**
 * Auto-categorize all transactions that don't have a category yet.
 * Matches transaction descriptions against keyword lists (case-insensitive).
 * Returns the number of transactions that were categorized.
 */
export function autoCategorize(): number {
  const db = getDb()

  const categories = db.prepare('SELECT id, name, keywords FROM categories').all() as CategoryRow[]
  const uncategorized = db.prepare(
    'SELECT id, description FROM transactions WHERE category IS NULL'
  ).all() as TransactionRow[]

  if (uncategorized.length === 0) return 0

  // Build a lookup: keyword (uppercase) → category name
  const keywordMap = new Map<string, string>()
  for (const cat of categories) {
    const keywords: string[] = JSON.parse(cat.keywords)
    for (const kw of keywords) {
      keywordMap.set(kw.toUpperCase(), cat.name)
    }
  }

  const update = db.prepare('UPDATE transactions SET category = ? WHERE id = ?')
  let count = 0

  const tx = db.transaction(() => {
    for (const row of uncategorized) {
      const desc = row.description.toUpperCase()
      for (const [keyword, category] of keywordMap) {
        if (desc.includes(keyword)) {
          update.run(category, row.id)
          count++
          break // first match wins
        }
      }
    }
  })
  tx()

  return count
}

/**
 * Categorize a single transaction by its description.
 * Returns the category name or null if no match.
 */
export function matchCategory(description: string): string | null {
  const db = getDb()
  const categories = db.prepare('SELECT name, keywords FROM categories').all() as CategoryRow[]
  const desc = description.toUpperCase()

  for (const cat of categories) {
    const keywords: string[] = JSON.parse(cat.keywords)
    for (const kw of keywords) {
      if (desc.includes(kw.toUpperCase())) {
        return cat.name
      }
    }
  }
  return null
}
