Kjør dette for å hente fersk data fra BRREG:

```bash
cd scripts
python hent_data.py
```

Dette vil:
1. Hente alle fysioterapeuter med næringskode 86.901
2. Lagre/oppdatere dem i backend/fysioterapeuter.db
3. Skrive ut statistikk når det er ferdig

Typisk kjøretid: 2–5 minutter avhengig av antall sider.
