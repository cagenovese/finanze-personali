import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'

let db: Database.Database | null = null

function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  const dataDir = join(userDataPath, 'data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  return join(dataDir, 'finanze.db')
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath())
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      hash        TEXT UNIQUE NOT NULL,
      date        TEXT NOT NULL,
      description TEXT NOT NULL,
      amount      REAL NOT NULL,
      currency    TEXT NOT NULL DEFAULT 'EUR',
      source      TEXT NOT NULL,
      category    TEXT,
      is_necessary INTEGER,
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT UNIQUE NOT NULL,
      keywords TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      month    TEXT NOT NULL,
      amount   REAL NOT NULL,
      UNIQUE(category, month)
    );

    CREATE TABLE IF NOT EXISTS splitwise_expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      hash        TEXT UNIQUE NOT NULL,
      date        TEXT NOT NULL,
      description TEXT NOT NULL,
      category    TEXT,
      total_cost  REAL NOT NULL,
      currency    TEXT NOT NULL DEFAULT 'EUR',
      balances    TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS import_log (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp         TEXT NOT NULL DEFAULT (datetime('now')),
      source            TEXT NOT NULL,
      file_name         TEXT NOT NULL,
      records_imported  INTEGER NOT NULL DEFAULT 0,
      records_skipped   INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
  `)

  migrateSchema(db)
  seedCategories(db)
}

function migrateSchema(db: Database.Database): void {
  const cols = (db.prepare('PRAGMA table_info(transactions)').all() as any[]).map((c: any) => c.name)
  if (!cols.includes('is_split')) {
    db.exec('ALTER TABLE transactions ADD COLUMN is_split INTEGER NOT NULL DEFAULT 0')
  }
  if (!cols.includes('split_from')) {
    db.exec('ALTER TABLE transactions ADD COLUMN split_from INTEGER')
  }
}

const CATEGORIES: [string, string[]][] = [
  ['Cibo',            ['LIDL', 'UBER EATS', 'PIZZA', 'RISTORANTE', 'TRATTORIA', 'RIFUGIO', 'BAR ',
                       'CONAD', 'EDEKA', 'REWE', 'ALDI', 'HAFERKATER', 'BAECKER', 'REICHELT',
                       'NAHKAUF', 'FARMERS KITCHEN', 'BURGERMEISTER', 'KORO', 'CUPESSE',
                       'KASCHK', 'PASTICCERIA', 'DOLOMITI', 'LEON DORO', 'SOTTOPASSO',
                       'VITELLI', 'BAI DE DONES', 'POMEDES', 'SOCREPES', 'ENOTECA']],
  ['Salute',          ['FARMACIA', 'KRANKENVERS', 'OTTONOVA', 'LABOR 28', 'MVZ', 'APOTHEKE']],
  ['Sport',           ['SKIPASS', 'SNOW SERVICE', 'GYM', 'DECATHLON', 'URBAN SPORTS', 'STAR SKI',
                       'TENNIS', 'DER BERG RUFT']],
  ['Trasporti',       ['ATM', 'TRENORD', 'ENI', 'BOLT', 'BVG', 'TAXI', 'UBER TRIP',
                       'DB VERTRIEB', 'DB FERNVERKEHR', 'FLUGHAFEN', 'TANKSTELLE']],
  ['Intrattenimento', ['NETFLIX', 'SPOTIFY', 'AMZN', 'AMAZON', 'CINEMA']],
  ['Abbigliamento',   ['ZARA', 'H&M']],
  ['Viaggi',          ['BOOKING', 'RYANAIR', 'HOTEL', 'EASYJET', 'THE NIU', 'AIRBNB',
                       'DUFRITAL', 'LS TRAVEL']],
  ['Servizi',         ['ENEL', 'VODAFONE', 'APPLE.COM', 'VATTENFALL', 'TELEFONICA', 'O2']],
  ['Casa',            ['AFFITTO', 'IKEA']],
  ['Apprendimento',   ['UDEMY', 'COURSERA']],
  ['Tasse',           ['ADAC', 'VERSICHERUNG', 'RUNDFUNK', 'ACCOUNT MANAGEMENT']],
  ['Spesa',           ['SUPERMARKT', 'SUPERMERCATO', 'MARKET']],
  ['Drinks',          ['KNEIPE', 'PUB', 'BIERGARTEN']],
  ['Stipendio',       []],
  ['Altro',           []],
]

function seedCategories(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }
  const isUpdate = count.c > 0
  if (isUpdate) {
    // Update existing keywords to the latest set
    const upsert = db.prepare('UPDATE categories SET keywords = ? WHERE name = ?')
    const insertNew = db.prepare('INSERT OR IGNORE INTO categories (name, keywords) VALUES (?, ?)')
    const tx = db.transaction((cats: [string, string[]][]) => {
      for (const [name, keywords] of cats) {
        upsert.run(JSON.stringify(keywords), name)
        insertNew.run(name, JSON.stringify(keywords))
      }
    })
    tx(CATEGORIES)
    return
  }

  const insert = db.prepare('INSERT OR IGNORE INTO categories (name, keywords) VALUES (?, ?)')
  const tx = db.transaction(() => {
    for (const [name, keywords] of CATEGORIES) {
      insert.run(name, JSON.stringify(keywords))
    }
  })
  tx()
}

// ── Query helpers ──────────────────────────────────────

export function insertTransaction(tx: {
  hash: string; date: string; description: string;
  amount: number; currency: string; source: string;
  category?: string | null;
}): boolean {
  const db = getDb()
  try {
    db.prepare(`
      INSERT INTO transactions (hash, date, description, amount, currency, source, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(tx.hash, tx.date, tx.description, tx.amount, tx.currency, tx.source, tx.category ?? null)
    return true
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return false
    throw e
  }
}

export function insertSplitwiseExpense(exp: {
  hash: string; date: string; description: string;
  category: string | null; total_cost: number; currency: string;
  balances: Record<string, number>;
}): boolean {
  const db = getDb()
  try {
    db.prepare(`
      INSERT INTO splitwise_expenses (hash, date, description, category, total_cost, currency, balances)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(exp.hash, exp.date, exp.description, exp.category, exp.total_cost, exp.currency, JSON.stringify(exp.balances))
    return true
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return false
    throw e
  }
}

export function logImport(source: string, fileName: string, imported: number, skipped: number): void {
  getDb().prepare(`
    INSERT INTO import_log (source, file_name, records_imported, records_skipped)
    VALUES (?, ?, ?, ?)
  `).run(source, fileName, imported, skipped)
}

export function getImportHistory(): any[] {
  return getDb().prepare('SELECT * FROM import_log ORDER BY timestamp DESC LIMIT 50').all()
}

export function getTransactionCount(): number {
  return (getDb().prepare('SELECT COUNT(*) as c FROM transactions').get() as { c: number }).c
}

// ── Transaction queries ───────────────────────────────

export interface TransactionFilters {
  source?: string
  category?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  uncategorizedOnly?: boolean
}

export function getTransactions(filters: TransactionFilters = {}): any[] {
  const db = getDb()
  const conditions: string[] = []
  const params: any[] = []

  if (filters.source) {
    conditions.push('source = ?')
    params.push(filters.source)
  }
  if (filters.category) {
    conditions.push('category = ?')
    params.push(filters.category)
  }
  if (filters.uncategorizedOnly) {
    conditions.push('category IS NULL')
  }
  if (filters.search) {
    conditions.push('UPPER(description) LIKE ?')
    params.push(`%${filters.search.toUpperCase()}%`)
  }
  if (filters.dateFrom) {
    conditions.push('date >= ?')
    params.push(filters.dateFrom)
  }
  if (filters.dateTo) {
    conditions.push('date <= ?')
    params.push(filters.dateTo)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return db.prepare(`SELECT * FROM transactions ${where} ORDER BY date DESC, id DESC`).all(...params)
}

export function updateTransaction(
  id: number,
  fields: { category?: string | null; is_necessary?: number | null; notes?: string | null }
): void {
  const db = getDb()
  const sets: string[] = []
  const params: any[] = []

  if ('category' in fields) {
    sets.push('category = ?')
    params.push(fields.category ?? null)
  }
  if ('is_necessary' in fields) {
    sets.push('is_necessary = ?')
    params.push(fields.is_necessary ?? null)
  }
  if ('notes' in fields) {
    sets.push('notes = ?')
    params.push(fields.notes ?? null)
  }

  if (sets.length === 0) return
  params.push(id)
  db.prepare(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`).run(...params)
}

// ── Category queries ──────────────────────────────────

export function getCategories(): { id: number; name: string; keywords: string[] }[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM categories ORDER BY name').all() as any[]
  return rows.map(r => ({ id: r.id, name: r.name, keywords: JSON.parse(r.keywords) }))
}

export function updateCategoryKeywords(id: number, keywords: string[]): void {
  getDb().prepare('UPDATE categories SET keywords = ? WHERE id = ?').run(JSON.stringify(keywords), id)
}

// ── Budget queries ────────────────────────────────────

export function getBudgets(month: string): { category: string; budget: number }[] {
  return getDb()
    .prepare('SELECT category, amount as budget FROM budgets WHERE month = ? ORDER BY category')
    .all(month) as any[]
}

export function setBudget(category: string, month: string, amount: number): void {
  getDb().prepare(`
    INSERT INTO budgets (category, month, amount) VALUES (?, ?, ?)
    ON CONFLICT(category, month) DO UPDATE SET amount = excluded.amount
  `).run(category, month, amount)
}

export function getSpendingByCategory(month: string): { category: string; spent: number }[] {
  const dateFrom = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const dateTo = `${month}-${String(lastDay).padStart(2, '0')}`

  return getDb().prepare(`
    SELECT category, SUM(ABS(amount)) as spent
    FROM transactions
    WHERE date >= ? AND date <= ? AND amount < 0 AND category IS NOT NULL AND is_split = 0
    GROUP BY category
    ORDER BY category
  `).all(dateFrom, dateTo) as any[]
}

export function addManualTransaction(tx: {
  date: string; description: string; amount: number; category: string | null; notes: string | null
}): number {
  const hash = createHash('sha256')
    .update(`manual-${tx.date}-${tx.description}-${tx.amount}-${Date.now()}`)
    .digest('hex').slice(0, 16)
  const result = getDb().prepare(`
    INSERT INTO transactions (hash, date, description, amount, currency, source, category, notes)
    VALUES (?, ?, ?, ?, 'EUR', 'Manuale', ?, ?)
  `).run(hash, tx.date, tx.description, tx.amount, tx.category ?? null, tx.notes ?? null)
  return result.lastInsertRowid as number
}

export function splitTransaction(
  parentId: number,
  splits: { description: string; amount: number; category: string | null }[]
): void {
  const db = getDb()
  const parent = db.prepare('SELECT * FROM transactions WHERE id = ?').get(parentId) as any
  if (!parent) throw new Error('Transaction not found')

  const tx = db.transaction(() => {
    db.prepare('UPDATE transactions SET is_split = 1 WHERE id = ?').run(parentId)
    for (const split of splits) {
      const hash = createHash('sha256')
        .update(`split-${parentId}-${split.description}-${split.amount}-${Date.now()}-${Math.random()}`)
        .digest('hex').slice(0, 16)
      db.prepare(`
        INSERT INTO transactions (hash, date, description, amount, currency, source, category, split_from)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(hash, parent.date, split.description, split.amount, parent.currency, parent.source, split.category ?? null, parentId)
    }
  })
  tx()
}

export function getAvailableMonths(): string[] {
  const rows = getDb().prepare(`
    SELECT DISTINCT substr(date, 1, 7) as month FROM transactions ORDER BY month DESC
  `).all() as { month: string }[]
  return rows.map(r => r.month)
}

// ── Report queries ────────────────────────────────────

export function getMonthlyNecessary(month: string): { necessary: number; unnecessary: number; income: number } {
  const dateFrom = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const dateTo = `${month}-${String(lastDay).padStart(2, '0')}`

  const rows = getDb().prepare(`
    SELECT
      SUM(CASE WHEN amount < 0 AND is_necessary = 1 THEN ABS(amount) ELSE 0 END) as necessary,
      SUM(CASE WHEN amount < 0 AND (is_necessary = 0 OR is_necessary IS NULL) THEN ABS(amount) ELSE 0 END) as unnecessary,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income
    FROM transactions
    WHERE date >= ? AND date <= ?
  `).get(dateFrom, dateTo) as any
  return {
    necessary: rows.necessary ?? 0,
    unnecessary: rows.unnecessary ?? 0,
    income: rows.income ?? 0,
  }
}

export interface MonthlyTrend {
  month: string
  spent: number
  income: number
  saved: number
}

export function getAnnualTrend(year: string): MonthlyTrend[] {
  const rows = getDb().prepare(`
    SELECT
      substr(date, 1, 7) as month,
      SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as spent,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income
    FROM transactions
    WHERE substr(date, 1, 4) = ?
    GROUP BY month
    ORDER BY month ASC
  `).all(year) as any[]

  return rows.map(r => ({
    month: r.month,
    spent: r.spent ?? 0,
    income: r.income ?? 0,
    saved: (r.income ?? 0) - (r.spent ?? 0),
  }))
}

export function getAvailableYears(): string[] {
  const rows = getDb().prepare(`
    SELECT DISTINCT substr(date, 1, 4) as year FROM transactions ORDER BY year DESC
  `).all() as { year: string }[]
  return rows.map(r => r.year)
}

// ── Splitwise queries ─────────────────────────────────

export function getSplitwiseExpenses(): any[] {
  return getDb().prepare(`
    SELECT * FROM splitwise_expenses ORDER BY date DESC
  `).all().map((r: any) => ({
    ...r,
    balances: JSON.parse(r.balances),
  }))
}

export function getSplitwiseBalances(): Record<string, number> {
  const rows = getDb().prepare('SELECT balances FROM splitwise_expenses').all() as { balances: string }[]
  const totals: Record<string, number> = {}

  for (const row of rows) {
    const balances = JSON.parse(row.balances)
    for (const [person, amount] of Object.entries(balances)) {
      totals[person] = (totals[person] || 0) + (amount as number)
    }
  }

  return totals
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
