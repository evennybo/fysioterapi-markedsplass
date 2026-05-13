Vis statistikk fra databasen:

```bash
python3 -c "
import sqlite3, pathlib
db = pathlib.Path('backend/fysioterapeuter.db')
if not db.exists():
    print('Ingen database funnet. Kjør /hent-data først.')
else:
    conn = sqlite3.connect(db)
    totalt = conn.execute('SELECT COUNT(*) FROM fysioterapeuter').fetchone()[0]
    aktive = conn.execute('SELECT COUNT(*) FROM fysioterapeuter WHERE konkurs=0 AND under_avvikling=0').fetchone()[0]
    print(f'Totalt: {totalt}')
    print(f'Aktive: {aktive}')
    print()
    print('Top 10 kommuner:')
    for r in conn.execute('SELECT kommune, COUNT(*) n FROM fysioterapeuter WHERE konkurs=0 GROUP BY kommune ORDER BY n DESC LIMIT 10').fetchall():
        print(f'  {r[0]:<26} {r[1]}')
    conn.close()
"
```
