# Finanze Personali

App Python + Streamlit per la gestione delle finanze personali.

## Funzionalità

- Importazione CSV da N26, Revolut, Commerzbank, American Express, Trade Republic, Splitwise
- Categorizzazione automatica delle transazioni via keyword matching
- Gestione budget mensile per categoria
- Riepilogo spese condivise (Splitwise)
- Report mensile e dashboard annuale

## Stack

- **Python 3.x**
- **Streamlit** — UI
- **SQLite** — database locale
- **pandas** — parsing CSV
- **plotly** — grafici

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

## Struttura

```
finanze-personali/
├── app.py                  # Entry point Streamlit
├── db.py                   # Schema SQLite e query
├── categorizer.py          # Keyword matching engine
├── parsers/                # Parser per ogni banca
│   ├── n26.py
│   ├── revolut.py
│   ├── commerzbank.py
│   ├── amex.py
│   ├── traderepublic.py
│   └── splitwise.py
├── pages/                  # Pagine Streamlit
│   ├── 1_Import.py
│   ├── 2_Transazioni.py
│   ├── 3_Budget.py
│   ├── 4_Splitwise.py
│   ├── 5_Report_Mensile.py
│   └── 6_Dashboard.py
└── data/                   # Database SQLite (gitignored)
```
