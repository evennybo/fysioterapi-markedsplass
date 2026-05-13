# 🏃 Fysioterapeut Markedsplass

Norsk markedsplass for fysioterapeuter – bygget på åpne data fra [Brønnøysundregistrene](https://www.brreg.no).

## Kom i gang

### Steg 1 – Hent data fra BRREG

```bash
cd scripts
pip install requests
python hent_data.py
```

Henter ~6 000 fysioterapeuter og lagrer i `backend/fysioterapeuter.db`.

### Steg 2 – Start backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

→ API: http://localhost:8000  
→ Swagger-docs: http://localhost:8000/docs

### Steg 3 – Start frontend

```bash
cd frontend
npm install
npm run dev
```

→ App: http://localhost:5173

### Eller – start alt med ett script

```bash
chmod +x start.sh
./start.sh
```

---

## Bruk med Claude Code

Åpne prosjektmappen i Claude Code:

```bash
claude fysioterapi-markedsplass/
```

Claude Code leser `CLAUDE.md` automatisk og vet hva prosjektet er og hvordan det fungerer. Du kan si ting som:

- *"Legg til kart med Leaflet"*
- *"Bygg en berikings-side der fysioterapeuter kan oppdatere profilen sin"*
- *"Geokod alle adresser med Kartverket-API"*
- *"Skriv tester for API-et"*

---

## Mappestruktur

```
├── CLAUDE.md           ← Claude Code-instruksjoner
├── start.sh            ← Start alt på én gang
├── scripts/
│   └── hent_data.py   ← BRREG-henter
├── backend/
│   ├── main.py        ← FastAPI
│   ├── database.py    ← SQLite-spørringer
│   ├── models.py      ← Pydantic-modeller
│   └── requirements.txt
└── frontend/
    ├── index.html
    └── src/
        ├── pages/     ← SokSide, ProfilSide
        └── lib/api.js ← API-klient
```

## Lisens

Data fra BRREG er lisensiert under [NLOD](https://data.brreg.no/nlod/no/) – fri til kommersiell bruk.
