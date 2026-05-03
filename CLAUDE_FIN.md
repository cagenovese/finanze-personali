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

### Fase 3 — Transazioni + Categorizzazione ✅ (2026-03-22)

**Completato:**
- Categorizer engine (electron/categorizer.ts): keyword matching case-insensitive, auto-categorizza transazioni senza categoria
- Keyword set ampliato (~80 keyword): aggiunto HAFERKATER, REICHELT, FARMERS KITCHEN, UBER TRIP, DB VERTRIEB, EASYJET, VATTENFALL, TELEFONICA, URBAN SPORTS, ecc.
- Le keyword nel DB vengono aggiornate ad ogni avvio (non solo al seed iniziale)
- TanStack Table: tabella transazioni con sorting per colonna
- Inline editing: click su categoria → dropdown, click su Nec. → cicla S/N/·
- Filtri: ricerca descrizione, fonte, mese (YYYY-MM), categoria
- IPC handlers: transactions:list, transactions:update, categories:list, categories:updateKeywords, categorize:run

**Note tecniche:**
- Il preload output deve chiamarsi `index.js` (aggiunto rollupOptions.output.entryFileNames nel config electron-vite)
- Il seed delle categorie ora fa UPDATE se le categorie esistono già (upgrade delle keyword su DB esistente)
- Il filtro mese calcola dateFrom/dateTo dal YYYY-MM selezionato

**Prossima fase:** Fase 4 — Budget + Splitwise (modello consigliato: **Opus 4.6**)

### Fase 4 — Budget + Splitwise ✅ (2026-03-22)

**Completato:**
- DB queries: getBudgets, setBudget, getSpendingByCategory, getAvailableMonths, getSplitwiseExpenses, getSplitwiseBalances
- IPC handlers: budget:get, budget:set, budget:spending, budget:months, splitwise:expenses, splitwise:balances
- Budget page: selettore mese, card riepilogo (totale/speso/rimanente), righe per categoria con budget editabile inline e progress bar
- Splitwise page: bilancio utente, bilanci per persona (dare/ricevere), tabella spese con saldo per spesa

**Note tecniche:**
- Budget usa UPSERT (INSERT ON CONFLICT DO UPDATE) per la tabella budgets (UNIQUE su category+month)
- Spending calcolato come SUM(ABS(amount)) dove amount < 0 (solo spese) raggruppato per categoria
- Splitwise bilanci: somma di tutti i balances JSON per persona su tutte le spese
- USER_NAME hardcoded "Carlo Alberto Genovese" per il bilancio utente — da rendere configurabile in futuro
- I numeri Splitwise potrebbero necessitare revisione (segnalato dall'utente come "strani")

**Prossima fase:** Fase 5 — Report + Dashboard (modello consigliato: **Sonnet 4.6**)

### Fase 5 — Report + Dashboard ✅ (2026-03-22)

**Completato:**
- Recharts installato
- DB queries: getMonthlyNecessary, getAnnualTrend, getAvailableYears
- IPC handlers: report:monthly-necessary, report:annual-trend, report:years
- Dashboard: selettore anno, KPI cards (entrate/spese/risparmio/media), bar chart risparmio mensile (verde/rosso), bar chart entrate vs spese, mese più costoso, mesi con risparmio positivo
- MonthlyReport: selettore mese, KPI cards, pie chart spese per categoria, pie chart necessarie vs non necessarie, dettaglio categorie con progress bar

**Note tecniche:**
- `getSpendingByCategory` già esposta come `getSpending` nel preload — usata direttamente nel Report
- Colori hardcoded array di 12 tinte Obsidian-compatibili per i pie chart
- USER_NAME hardcoded in Splitwise.tsx — da rendere configurabile in futuro
- Piccoli dettagli UI da correggere in sessioni successive (segnalati dall'utente)

**Prossima fase:** da definire — possibili miglioramenti: fix Splitwise bilanci, fix Trade Republic PDF, configurazione USER_NAME

### Allineamento DB con Excel + Entrate Regolare/Irregolare ✅ (2026-03-28)

**Completato:**
- Script Python `/Users/carloalbertogenovese/Documents/SOLDI/import_from_excel.py` che elimina le transazioni Jan+Feb dal DB e reimporta dall'Excel (Finanze_Personali.xlsm)
- Jan 2026: 95 transazioni, Feb 2026: 96 transazioni — corrispondenza esatta con Excel
- Split ATM preservati: 3 genitori (is_split=1), 11 figli (split_from=parent_id) con SUDDIV IDs
- Hash duplicati gestiti con suffix `_N` per i figli di split con hash uguale nel Excel
- Categorie aggiunte: Spesa, Drinks, Stipendio (sia in db.ts che direttamente nel DB)
- UI: colonna "Nec./Reg." mostra S/N per spese (Necessaria/Non necessaria) e R/I per entrate (Regolare/Irregolare), stessa codifica is_necessary 1/0/null

**Note tecniche:**
- is_necessary: Necessaria/Regolare → 1, Non Necessaria/Irregolare → 0, Suddiviso/parent → NULL
- Le query report (getMonthlyNecessary, getSpendingByCategory) già corrette: filtrano amount < 0 per le spese, quindi le entrate con is_necessary=1 (Regolare) non inquinano i totali
- Script da rieseguire se si modifica l'Excel; non tocca i mesi ≥ marzo

### Funzionalità aggiuntive ✅ (2026-03-23)

**Completato:**
- Aggiunta transazione manuale: modal con data, importo, descrizione, categoria, note; source = "Manuale"
- Menu ⋮ per riga nella tabella transazioni (struttura pronta per future azioni)
- Suddivisione transazione (ATM split): modal con N voci descrizione/importo/categoria, indicatore rimanente, salvataggio quando totale = importo originale
- DB migration: colonne `is_split` e `split_from` aggiunte via PRAGMA table_info (safe su DB esistente)
- Spending queries escludono `is_split = 1` per evitare doppio conteggio
- Visual: padri suddivisi a opacità ridotta con badge "suddiviso"; figli con badge "split"

**Note tecniche:**
- Hash per transazioni manuali: `manual-${date}-${description}-${amount}-${Date.now()}`
- Hash per figli split: include `Math.random()` per garantire unicità in caso di voci identiche
- Il menu ⋮ chiude automaticamente al click fuori tramite `mousedown` listener sul document

### Fix risparmio mensile gen/feb 2026 ✅ (2026-05-03)

**Problema riportato:** il "totale risparmiato" per gennaio e febbraio 2026 differiva tra app e Excel.

**Diagnosi:**
1. **Bug calcolo MonthlyReport** (`src/pages/MonthlyReport.tsx`): `totalSpent` era calcolato sommando `getSpending(month)`, che a sua volta filtra `category IS NOT NULL` (`db.ts:getSpendingByCategory`). Quindi le spese senza categoria venivano escluse dal "TOTALE SPESE" e dal "RISPARMIO", ma ancora conteggiate in `getMonthlyNecessary` (dove `is_necessary IS NULL` cade nel ramo `unnecessary`). La pagina Dashboard era invece corretta perché `getAnnualTrend` non filtra per categoria.
2. **Bug dati**: 7 transazioni in DB per gen/feb avevano `category=NULL` e `is_necessary=NULL`, mentre in Excel erano tutte classificate (verosimilmente perché un re-import CSV dopo `import_from_excel.py` ha ricreato righe con descrizione contenente apostrofi senza ripassare dalla classificazione manuale Excel).

**Fix:**
- `src/pages/MonthlyReport.tsx`: `totalSpent = necessary.necessary + necessary.unnecessary` (allineato a Dashboard ed Excel `B11+B12`). Aggiunta fetta "Senza categoria" al pie chart "Spese per categoria" e alla breakdown table quando `totalSpent > Σ categorizzato`, così la somma delle fette torna sempre uguale al KPI "SPESE".
- DB: script `patch_missing_classifications.py` (in `~/Documents/SOLDI/`) che fa match per `(date, normDesc, amount)` tra Excel e DB e copia `category`, `is_necessary`, `notes` solo dove DB è NULL. Backup creato come `finanze.db.backup-20260503-pre-patch`.

**Verifica post-fix:**
```
Month      KPI                Excel        App         Δ
2026-01    ENTRATE          4994.75     4994.75    +0.00  ✓
2026-01    USCITE (TOT)     4052.58     4052.58    +0.00  ✓
2026-01    RISPARMIO         942.17      942.17    +0.00  ✓
2026-02    ENTRATE          5019.11     5019.11    +0.00  ✓
2026-02    USCITE (TOT)     4182.17     4182.17    +0.00  ✓
2026-02    RISPARMIO         836.94      836.94    +0.00  ✓
```

**Note tecniche / debt residuo:**
- L'app ora è coerente con Excel **a patto che ogni transazione abbia `is_necessary` impostato**. Se ne arriva una con `is_necessary=NULL`, finisce in `unnecessary` (per via del CASE in `getMonthlyNecessary`); Excel invece la escluderebbe del tutto. Per ora va bene perché i dati attuali sono completi, ma è una potenziale fonte di divergenza futura.
- La logica di hash anti-duplicato (`txHash` in `electron/parsers/types.ts`) normalizza già la descrizione, quindi nuovi re-import CSV non dovrebbero ricreare i duplicati. Il caso patchato qui è retroattivo: probabile importazione antecedente all'introduzione della normalizzazione.

## GitHub

- Repo: https://github.com/cagenovese/finanze-personali
- User: cagenovese
- Locale: /Users/carloalbertogenovese/Documents/SOLDI/finanze-personali
