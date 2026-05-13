"""
scripts/geokod.py
=================
Geokoder adresser for alle fysioterapeuter i databasen som mangler lat/lon.
Bruker Kartverkets gratis adresse-API (ingen API-nøkkel nødvendig).

Kjøring:
    pip install requests
    python geokod.py [--alle]   # --alle tvinger ny geokoding selv om lat/lon finnes

Kartverket-API:
    https://ws.geonorge.no/adresser/v1/
    Retningslinje: rimelig bruk, ingen hard rate-limit, men vi venter 0.2s mellom kall.
"""

import argparse
import logging
import sqlite3
import time
from pathlib import Path

import requests

DB_PATH = Path(__file__).parent.parent / "backend" / "fysioterapeuter.db"
API_URL = "https://ws.geonorge.no/adresser/v1/sok"
VENTETID = 0.2   # sekunder mellom kall

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)


def geokod_kartverket(adresse: str, postnummer: str | None, poststed: str | None) -> tuple[float, float] | None:
    """Slå opp koordinater via Kartverkets adresse-API. Returnerer (lat, lon) eller None."""
    params: dict = {"fuzzy": True, "treffPerSide": 1, "side": 0}

    if postnummer:
        params["postnummer"] = postnummer
    if adresse:
        params["sok"] = adresse
    elif poststed:
        params["sok"] = poststed

    try:
        resp = requests.get(API_URL, params=params, timeout=10,
                            headers={"User-Agent": "FysioterapiMarkedsplass/1.0"})
        resp.raise_for_status()
        data = resp.json()
        adresser = data.get("adresser", [])
        if not adresser:
            return None
        representasjonspunkt = adresser[0].get("representasjonspunkt", {})
        lat = representasjonspunkt.get("lat")
        lon = representasjonspunkt.get("lon")
        if lat and lon:
            return float(lat), float(lon)
    except Exception as e:
        log.warning(f"Kartverket-feil: {e}")
    return None


def main():
    parser = argparse.ArgumentParser(description="Geokod fysioterapeuter")
    parser.add_argument("--alle", action="store_true", help="Geokod alle, også de som allerede har lat/lon")
    args = parser.parse_args()

    if not DB_PATH.exists():
        log.error(f"Database ikke funnet: {DB_PATH}. Kjør scripts/hent_data.py først.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    where = "WHERE godkjent_for_visning = 1 AND konkurs = 0 AND under_avvikling = 0"
    if not args.alle:
        where += " AND (lat IS NULL OR lon IS NULL)"

    rader = conn.execute(
        f"SELECT id, navn, adresse, postnummer, poststed, kommune FROM fysioterapeuter {where}"
    ).fetchall()

    totalt = len(rader)
    log.info(f"{totalt} adresser skal geokodes")

    treff = ingen_treff = feil = 0

    for i, rad in enumerate(rader, 1):
        coords = geokod_kartverket(rad["adresse"], rad["postnummer"], rad["poststed"])

        if coords:
            lat, lon = coords
            conn.execute(
                "UPDATE fysioterapeuter SET lat = ?, lon = ?, sist_oppdatert_i_db = datetime('now') WHERE id = ?",
                (lat, lon, rad["id"]),
            )
            conn.commit()
            treff += 1
            log.info(f"[{i}/{totalt}] ✓ {rad['navn'][:40]:<40}  {lat:.5f}, {lon:.5f}")
        else:
            ingen_treff += 1
            log.warning(f"[{i}/{totalt}] ✗ {rad['navn'][:40]:<40}  {rad['adresse'] or ''}, {rad['postnummer'] or ''} {rad['poststed'] or ''}")

        time.sleep(VENTETID)

    conn.close()
    print(f"\n{'═'*52}")
    print(f"  Geokoding ferdig")
    print(f"  Treff:      {treff}")
    print(f"  Ingen treff:{ingen_treff}")
    print(f"{'═'*52}\n")


if __name__ == "__main__":
    main()
