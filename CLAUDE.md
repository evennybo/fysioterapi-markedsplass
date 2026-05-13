# Fysioterapi Markedsplass – Claude Code Guide

Du bygger en norsk markedsplass for fysioterapeuter basert på åpne data fra Brønnøysundregistrene (BRREG).

## Prosjektoversikt

```
fysioterapi-markedsplass/
├── CLAUDE.md                  ← Du er her
├── backend/
│   ├── main.py                ← FastAPI REST-API
│   ├── database.py            ← SQLite-håndtering
│   ├── models.py              ← Pydantic-modeller
│   └── fysioterapeuter.db     ← Genereres av scripts/hent_data.py
├── frontend/
│   ├── index.html
│   └── src/
│       ├── components/        ← Gjenbrukbare UI-komponenter
│       ├── pages/             ← Sider (søk, profil, kart)
│       ├── hooks/             ← Custom React hooks
│       └── lib/               ← API-klient, utils
├── scripts/
│   └── hent_data.py           ← Henter fysioterapeuter fra BRREG
└── .claude/
    └── commands/              ← Custom slash-kommandoer
```

## Første gang – Hent data fra BRREG

```bash
cd scripts
pip install requests
python hent_data.py
```

Dette henter alle ~6 000 fysioterapauter fra BRREG og lagrer dem i `backend/fysioterapeuter.db`.

## Start backend (FastAPI)

```bash
cd backend
pip install fastapi uvicorn
uvicorn main:app --reload --port 8000
```

API-dokumentasjon: http://localhost:8000/docs

## Start frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Databaseskjema

Hovedtabell: `fysioterapeuter`

| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| organisasjonsnummer | TEXT PK | Unikt 9-sifret org.nr |
| navn | TEXT | Virksomhetsnavn |
| adresse | TEXT | Gateadresse |
| postnummer | TEXT | Postnummer |
| poststed | TEXT | Poststed |
| kommune | TEXT | Kommune |
| fylke | TEXT | Fylke (utledet) |
| lat | REAL | Breddegrad (etter geokoding) |
| lon | REAL | Lengdegrad (etter geokoding) |
| antall_ansatte | INTEGER | Registrerte ansatte |
| organisasjonsform_kode | TEXT | ENK, AS, ANS osv. |
| naeringskode1 | TEXT | 86.901 = Fysioterapi |
| konkurs | INTEGER | 1 hvis konkurs |
| under_avvikling | INTEGER | 1 hvis under avvikling |
| hjemmeside | TEXT | Lagt til av virksomheten selv |
| epost | TEXT | Lagt til av virksomheten selv |
| telefon | TEXT | Lagt til av virksomheten selv |
| spesialiteter | TEXT | JSON-array med spesialiteter |
| beskrivelse | TEXT | Fritekst fra virksomheten |
| godkjent_for_visning | INTEGER | 1 = publisert på markedsplassen |

## API-endepunkter (backend)

| Metode | Rute | Beskrivelse |
|--------|------|-------------|
| GET | /api/fysioterapeuter | Søk og list alle |
| GET | /api/fysioterapeuter/{orgnr} | Hent én |
| GET | /api/kommuner | Alle kommuner med antall |
| GET | /api/fylker | Alle fylker med antall |
| GET | /api/statistikk | Samlet statistikk |
| PUT | /api/fysioterapeuter/{orgnr} | Oppdater profil |

### Søkeparametere for GET /api/fysioterapeuter

- `q` – Fritekstsøk på navn
- `kommune` – Filtrer på kommune
- `fylke` – Filtrer på fylke
- `postnummer` – Filtrer på postnummer
- `spesialitet` – Filtrer på spesialitet
- `page` – Sidenummer (default: 0)
- `size` – Resultater per side (default: 20)

## Viktige designvalg

- **Enkelt og norsk** – Alt UI er på norsk
- **BRREG er kilde til sannhet** – Grunndata kommer alltid fra BRREG
- **Berikelse er opt-in** – Fysioterapeuter kan selv legge til kontaktinfo/beskrivelse
- **Ingen innlogging kreves** for å søke
- **SQLite i dev** – Enkelt å komme i gang, bytt til PostgreSQL ved behov

## Custom slash-kommandoer

Bruk disse i Claude Code:

- `/hent-data` – Henter fersk data fra BRREG
- `/statistikk` – Viser databasestatistikk
- `/geokod` – Geokoder adresser (krever internett)

## Vanlige oppgaver for Claude Code

```
"Legg til søk på spesialitet i API-et"
"Bygg et kartkart-komponent med Leaflet"
"Lag en profil-side for en fysioterapeut"
"Legg til paginering i søkeresultatene"
"Skriv tester for API-endepunktene"
"Geokod alle adresser med Kartverket-API"
```
