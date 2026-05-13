"""
scripts/geokod_alle.py
======================
Geokoder alle adresser som mangler koordinater ved hjelp av Kartverket-API.
Bruker threading for parallell kjøring (respektfullt mot API).

Kjøring:
    python geokod_alle.py
"""

import sqlite3
import urllib.request
import urllib.parse
import json
import time
import threading
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "backend" / "fysioterapeuter.db"
KARTVERKET_URL = "https://ws.geonorge.no/adresser/v1/sok"
MAX_WORKERS = 8
DELAY_BETWEEN_BATCHES = 0.1  # sekunder mellom batch-er

lock = threading.Lock()
stats = {"ok": 0, "feil": 0, "done": 0, "total": 0}


def kartverket_geokod(adresse: str, postnummer: str) -> tuple[float, float] | None:
    """Returnerer (lat, lon) eller None."""
    params = {
        "sok": adresse,
        "postnummer": postnummer,
        "treffPerSide": 1,
        "utkoordsys": 4258,  # WGS84
    }
    url = KARTVERKET_URL + "?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "fysioterapi-markedsplass/1.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read())
        adresser = data.get("adresser", [])
        if not adresser:
            return None
        a = adresser[0]
        representasjonspunkt = a.get("representasjonspunkt", {})
        lat = representasjonspunkt.get("lat")
        lon = representasjonspunkt.get("lon")
        if lat and lon:
            return float(lat), float(lon)
    except Exception:
        pass
    return None


def behandle_batch(batch: list[tuple], conn_local: sqlite3.Connection):
    for orgnr, adresse, postnummer in batch:
        result = kartverket_geokod(adresse or "", postnummer or "")
        with lock:
            stats["done"] += 1
            if result:
                lat, lon = result
                conn_local.execute(
                    "UPDATE fysioterapeuter SET lat=?, lon=? WHERE organisasjonsnummer=?",
                    (lat, lon, orgnr),
                )
                conn_local.commit()
                stats["ok"] += 1
            else:
                stats["feil"] += 1
            if stats["done"] % 100 == 0:
                pct = stats["done"] / stats["total"] * 100
                print(
                    f"  [{stats['done']}/{stats['total']} {pct:.0f}%] "
                    f"OK={stats['ok']} Feil={stats['feil']}",
                    flush=True,
                )


def main():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    rows = conn.execute(
        "SELECT organisasjonsnummer, adresse, postnummer FROM fysioterapeuter "
        "WHERE lat IS NULL AND adresse IS NOT NULL AND adresse != ''"
    ).fetchall()

    if not rows:
        print("Ingen adresser mangler koordinater.")
        conn.close()
        return

    stats["total"] = len(rows)
    print(f"Geokoder {len(rows)} adresser med {MAX_WORKERS} tråder ...")

    # Del opp i batch-er per worker
    batch_size = max(1, len(rows) // MAX_WORKERS + 1)
    batches = [rows[i : i + batch_size] for i in range(0, len(rows), batch_size)]

    threads = []
    for batch in batches:
        t = threading.Thread(target=behandle_batch, args=(batch, conn))
        t.start()
        threads.append(t)
        time.sleep(DELAY_BETWEEN_BATCHES)

    for t in threads:
        t.join()

    total_geocoded = conn.execute(
        "SELECT COUNT(*) FROM fysioterapeuter WHERE lat IS NOT NULL"
    ).fetchone()[0]

    conn.close()
    print(f"\nFerdig! Totalt geocodet: {total_geocoded} av {stats['total'] + 257}")
    print(f"  Nye koordinater: {stats['ok']}")
    print(f"  Ikke funnet:     {stats['feil']}")


if __name__ == "__main__":
    main()
