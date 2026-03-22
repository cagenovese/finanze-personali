# Finanze Personali — Project Context

> **IMPORTANTE**: Questo file va aggiornato durante ogni sessione di lavoro.
> Registrare decisioni prese, stato di avanzamento, problemi aperti e prossimi passi,
> in modo da rendere il più semplice possibile la ripresa del lavoro tra una sessione e l'altra.

## Overview

Desktop app (Electron + React) per gestione finanze personali.
Sostituisce un file Excel (`Finanze_Personali.xlsm`) che importa CSV da 6 banche,
categorizza transazioni via keyword matching, traccia budget e genera report.

## Stack

- **Electron** — desktop shell
- **React + TypeScript + Vite** — frontend (renderer process)
- **Tailwind CSS + shadcn/ui** — styling
- **TanStack Table** — tabelle editabili
- **Recharts** — grafici
- **better-sqlite3** — database locale (main process)
- **papaparse** — parsing CSV
- **pdfjs-dist** — parsing PDF (Trade Republic)
- **electron-builder** — packaging

## Tema UI

File di riferimento: `THEME_OBSIDIAN.md` (copiato in repo).
- Dark-first, terminal-inspired, blue-violet accents
- Monospace (JetBrains Mono) per tutti i valori numerici
- Inter per UI labels
- No drop shadows, no looping animations
- Depth via background layering (#0E0F13 → #14151A → #1E2130 → #252840)
- Light mode supportato (warm off-white base #F5F2EC)

## Fonti dati CSV

| Banca | Separatore | Formato data | Decimale | Note |
|-------|-----------|-------------|----------|------|
| N26 | comma | YYYY-MM-DD | punto | 11 colonne |
| Revolut | comma | YYYY-MM-DD HH:MM:SS | punto | etichette italiane |
| Commerzbank | semicolon | DD.MM.YYYY | virgola | 8 colonne |
| AMEX | comma | DD/MM/YYYY | virgola | 3 colonne (Datum, Beschreibung, Betrag) |
| Trade Republic | N/A | N/A | N/A | **PDF**, non CSV |
| Splitwise | comma | YYYY-MM-DD | punto | colonne dinamiche per persona |

### Percorsi CSV locali

```
/Users/carloalbertogenovese/Documents/SOLDI/csvN26
/Users/carloalbertogenovese/Documents/SOLDI/csvRevolut
/Users/carloalbertogenovese/Documents/SOLDI/csvCommerzbank
/Users/carloalbertogenovese/Documents/SOLDI/csvAmex
/Users/carloalbertogenovese/Documents/SOLDI/csvTradeRepublic
/Users/carloalbertogenovese/Documents/SOLDI/csvSplitwise
```

## Categorie spesa (dal file Excel)

Cibo, Salute, Sport, Trasporti, Intrattenimento, Abbigliamento, Viaggi, Servizi, Casa, Apprendimento, Tasse, Altro/Varie

Con keyword matching automatico (es. LIDL → Cibo, FARMACIA → Salute, RYANAIR → Viaggi).

## Funzionalità (portate da Excel)

1. **Import CSV/PDF** — parser per ogni banca, deduplicazione via hash
2. **Categorizzazione automatica** — keyword → categoria, con override manuale
3. **Spese/Entrate manuali** — inserimento diretto
4. **Budget mensile** — per categoria, con alert se sforato
5. **Splitwise** — bilanci persone (chi deve dare/ricevere)
6. **Suddivisione prelievo ATM** — split tra categorie
7. **Report mensile** — necessarie vs non necessarie
8. **Dashboard annuale** — risparmio totale, media mensile, top categoria
9. **Log importazioni** — storico import

## Architettura

```
finanze-personali/
├── electron/
│   ├── main.ts                # Main process
│   ├── preload.ts             # IPC bridge
│   ├── db.ts                  # SQLite schema + query
│   ├── categorizer.ts         # Keyword matching
│   └── parsers/               # Un parser per banca
├── src/                       # React renderer
│   ├── App.tsx
│   ├── pages/                 # Import, Transactions, Budget, Splitwise, Report, Dashboard
│   ├── components/            # Sidebar, TransactionTable, BudgetCard, Charts
│   └── lib/ipc.ts             # Typed IPC client
└── data/finanze.db
```

## Fasi di sviluppo

> **NOTA**: All'inizio di ogni fase, consigliare all'utente il modello più adatto prima di iniziare.
> - **Sonnet 4.6**: scaffolding, boilerplate, config, codice ripetitivo — più veloce, meno costoso.
> - **Opus 4.6**: decisioni architetturali, debugging IPC Electron, edge case, logica complessa.

| Fase | Descrizione | Modello consigliato |
|------|-------------|---------------------|
| 1 | **Scaffolding** — Electron + Vite + React + SQLite + Tailwind, sidebar navigabile | Sonnet 4.6 |
| 2 | **Parsers + Import** — un parser per banca, pagina Import con progress | Opus 4.6 (formati CSV eterogenei, edge case) |
| 3 | **Transazioni + Categorizzazione** — tabella editabile, keyword engine | Opus 4.6 (logica categorizzazione, IPC) |
| 4 | **Budget + Splitwise** — tracking budget, bilanci persone | Opus 4.6 (logica bilanci, calcoli) |
| 5 | **Report + Dashboard** — grafici mensili/annuali | Sonnet 4.6 (componenti UI, grafici Recharts) |

## Stato avanzamento

### Fase 1 — Scaffolding ✅ (2026-03-22)

**Completato:**
- Electron 33 + electron-vite 2 + React 18 + TypeScript
- Tailwind CSS con tutti i token del tema Obsidian
- Sidebar sinistra (left rail) con 6 voci di navigazione e icone lucide-react
- 6 pagine stub: Dashboard, Transazioni, Import, Budget, Splitwise, Report Mensile
- React Router (MemoryRouter) per navigazione interna
- `titleBarStyle: hiddenInset` + traffic lights macOS
- Build e dev mode funzionanti (`npm run dev`)

**Note tecniche:**
- Il build del main process deve avere `rollupOptions.output.entryFileNames: 'index.js'` (electron-vite lo cerca hardcoded)
- Il renderer richiede `root` e `build.rollupOptions.input` espliciti perché `index.html` è alla root del progetto (non in `src/renderer/`)
- DB (better-sqlite3) non ancora aggiunto — verrà nella Fase 2

**Prossima fase:** Fase 2 — Parsers + Import (modello consigliato: **Opus 4.6**)

### Fase 2 — Parsers + Import ✅ (2026-03-22)

**Completato:**
- SQLite schema: transactions (hash dedup), categories (keyword seeding), budgets, splitwise_expenses, import_log
- 6 parser: N26, Revolut, Commerzbank, AMEX, Trade Republic (PDF via pdfjs-dist), Splitwise
- IPC wiring: main.ts handler → preload.ts bridge → src/lib/ipc.ts typed client
- Import page UI: card per sorgente con icona, bottone import singolo/tutti, indicatore stato, storico importazioni
- better-sqlite3 rebuilt per Electron via @electron/rebuild
- Build e dev mode funzionanti

**Note tecniche:**
- Trade Republic esporta PDF (non CSV): il parser usa pdfjs-dist, estrae testo posizionale, regex sulla sezione UMSATZÜBERSICHT
- pdf-parse v2 ha API diversa dal v1 (classe PDFParse, non function default). Usato pdfjs-dist direttamente via dynamic import
- Commerzbank: separatore `;`, decimale `,` — parseEuropeanAmount gestisce conversione
- AMEX: importi positivi nel CSV = spese → negati nel DB (negative = expense)
- Splitwise: colonne persona dinamiche, dati in tabella separata splitwise_expenses con balances JSON
- Deduplicazione: hash SHA-256 troncato a 16 char su (source + date + description + amount)

**Prossima fase:** Fase 3 — Transazioni + Categorizzazione (modello consigliato: **Opus 4.6**)

## GitHub

- Repo: https://github.com/cagenovese/finanze-personali
- User: cagenovese
- Locale: /Users/carloalbertogenovese/Documents/SOLDI/finanze-personali
