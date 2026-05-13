"""
scripts/geokod_fallback.py
==========================
Andre runde geokoding for adresser som feilet.
Strategier:
  1. Rens adresse (fjern c/o, etasje, etc.) og prøv Kartverket igjen
  2. Bruk bare postnummer+poststed for sentroid
"""

import sqlite3
import urllib.request
import urllib.parse
import json
import re
import threading
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "backend" / "fysioterapeuter.db"
KARTVERKET_URL = "https://ws.geonorge.no/adresser/v1/sok"
MAX_WORKERS = 8
lock = threading.Lock()
stats = {"ok": 0, "feil": 0, "done": 0, "total": 0}

RENS_PREFIXER = re.compile(
    r"^(c/o\s+[\w\s]+?,?\s*|v/\s*[\w\s]+?,?\s*|[\w\s]+\s+Standars?\s+gate\s*\d*,?\s*)",
    re.IGNORECASE,
)
ETASJE = re.compile(r"\d+\s*\.?\s*etasje\s*,?\s*", re.IGNORECASE)
CO_LINE = re.compile(r"^(c/o|v/)\s+[^,]+,\s*", re.IGNORECASE)
PERSON_PREFIX = re.compile(r"^[A-ZÆØÅ][a-zæøå]+\s+[A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅ][a-zæøå]+)?,\s*", re.IGNORECASE)


def rens_adresse(adresse: str) -> str:
    a = adresse.strip()
    a = CO_LINE.sub("", a)
    a = ETASJE.sub("", a)
    # fjern "Fornavn Etternavn, " prefiks
    a = PERSON_PREFIX.sub("", a)
    return a.strip().strip(",").strip()


def kartverket(sok: str, postnummer: str) -> tuple[float, float] | None:
    params = {"sok": sok, "postnummer": postnummer, "treffPerSide": 1, "utkoordsys": 4258}
    url = KARTVERKET_URL + "?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "fysioterapi-markedsplass/1.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read())
        adresser = data.get("adresser", [])
        if not adresser:
            return None
        rp = adresser[0].get("representasjonspunkt", {})
        lat, lon = rp.get("lat"), rp.get("lon")
        if lat and lon:
            return float(lat), float(lon)
    except Exception:
        pass
    return None


def kartverket_poststed(postnummer: str, poststed: str) -> tuple[float, float] | None:
    """Fallback: søk på poststed for å få en sentroid."""
    params = {"postnummer": postnummer, "treffPerSide": 1, "utkoordsys": 4258}
    url = KARTVERKET_URL + "?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "fysioterapi-markedsplass/1.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            data = json.loads(r.read())
        adresser = data.get("adresser", [])
        if not adresser:
            return None
        rp = adresser[0].get("representasjonspunkt", {})
        lat, lon = rp.get("lat"), rp.get("lon")
        if lat and lon:
            return float(lat), float(lon)
    except Exception:
        pass
    return None


def behandle_batch(batch, conn_local):
    for orgnr, adresse, postnummer, poststed in batch:
        result = None

        # Steg 1: rens adressen og prøv igjen
        renset = rens_adresse(adresse or "")
        if renset and renset != adresse:
            result = kartverket(renset, postnummer or "")

        # Steg 2: bare postnummer-sentroid
        if not result and postnummer:
            result = kartverket_poststed(postnummer, poststed or "")

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
        "SELECT organisasjonsnummer, adresse, postnummer, poststed "
        "FROM fysioterapeuter WHERE lat IS NULL"
    ).fetchall()

    if not rows:
        print("Ingen adresser mangler koordinater.")
        conn.close()
        return

    stats["total"] = len(rows)
    print(f"Fallback-geokoding for {len(rows)} adresser med {MAX_WORKERS} tråder ...")

    batch_size = max(1, len(rows) // MAX_WORKERS + 1)
    batches = [rows[i : i + batch_size] for i in range(0, len(rows), batch_size)]

    threads = []
    for batch in batches:
        t = threading.Thread(target=behandle_batch, args=(batch, conn))
        t.start()
        threads.append(t)
        time.sleep(0.05)

    for t in threads:
        t.join()

    total = conn.execute("SELECT COUNT(*) FROM fysioterapeuter WHERE lat IS NOT NULL").fetchone()[0]
    conn.close()
    print(f"\nFerdig! Totalt med koordinater nå: {total}/6852")
    print(f"  Nye koordinater: {stats['ok']}")
    print(f"  Fremdeles uten: {stats['feil']}")


if __name__ == "__main__":
    main()
