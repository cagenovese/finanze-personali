import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

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

  seedCategories(db)
}

function seedCategories(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }
  if (count.c > 0) return

  const categories: [string, string[]][] = [
    ['Cibo',            ['LIDL', 'UBER EATS', 'PIZZA', 'RISTORANTE', 'TRATTORIA', 'RIFUGIO', 'BAR ', 'CONAD', 'EDEKA', 'REWE', 'ALDI']],
    ['Salute',          ['FARMACIA', 'KRANKENVERS', 'OTTONOVA']],
    ['Sport',           ['SKIPASS', 'SNOW SERVICE', 'GYM', 'DECATHLON']],
    ['Trasporti',       ['ATM', 'TRENORD', 'ENI', 'BOLT', 'BVG', 'TAXI']],
    ['Intrattenimento', ['NETFLIX', 'SPOTIFY', 'AMAZON', 'CINEMA']],
    ['Abbigliamento',   ['ZARA', 'H&M']],
    ['Viaggi',          ['BOOKING', 'RYANAIR', 'HOTEL']],
    ['Servizi',         ['ENEL', 'VODAFONE', 'APPLE.COM']],
    ['Casa',            ['AFFITTO', 'IKEA']],
    ['Apprendimento',   ['UDEMY', 'COURSERA']],
    ['Tasse',           ['ADAC', 'VERSICHERUNG', 'RUNDFUNK']],
    ['Altro',           []],
  ]

  const insert = db.prepare('INSERT OR IGNORE INTO categories (name, keywords) VALUES (?, ?)')
  const tx = db.transaction(() => {
    for (const [name, keywords] of categories) {
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

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
