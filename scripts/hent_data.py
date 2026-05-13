"""
scripts/hent_data.py
====================
Henter alle fysioterapeuter fra Brønnøysundregistrene (BRREG)
og lagrer dem i ../backend/fysioterapeuter.db

Kjøring:
    pip install requests
    python hent_data.py
"""

import requests
import sqlite3
import json
import time
import logging
from datetime import datetime
from pathlib import Path

# ── Konfigurasjon ─────────────────────────────
DB_PATH = Path(__file__).parent.parent / "backend" / "fysioterapeuter.db"
API_BASE = "https://data.brreg.no/enhetsregisteret/api"
PAGE_SIZE = 200

NAERINGSKODER = [
    "86.950",  # Fysioterapi- og ergoterapitjenester
]

FYLKER = {
    "03": "Oslo", "11": "Rogaland", "15": "Møre og Romsdal",
    "18": "Nordland", "31": "Østfold", "32": "Akershus",
    "33": "Buskerud", "34": "Innlandet", "39": "Vestfold",
    "40": "Telemark", "42": "Agder", "46": "Vestland",
    "50": "Trøndelag", "55": "Troms", "56": "Finnmark",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ── Database ──────────────────────────────────
def opprett_database(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.executescript("""
    PRAGMA journal_mode=WAL;

    CREATE TABLE IF NOT EXISTS fysioterapeuter (
        id                              INTEGER PRIMARY KEY AUTOINCREMENT,
        organisasjonsnummer             TEXT UNIQUE NOT NULL,
        navn                            TEXT NOT NULL,
        organisasjonsform_kode          TEXT,
        organisasjonsform_beskrivelse   TEXT,
        naeringskode1                   TEXT,
        naeringskode1_beskrivelse       TEXT,
        adresse                         TEXT,
        postnummer                      TEXT,
        poststed                        TEXT,
        kommune                         TEXT,
        kommunenummer                   TEXT,
        fylke                           TEXT,
        landkode                        TEXT DEFAULT 'NO',
        lat                             REAL,
        lon                             REAL,
        antall_ansatte                  INTEGER,
        registrert_i_mva                INTEGER DEFAULT 0,
        konkurs                         INTEGER DEFAULT 0,
        under_avvikling                 INTEGER DEFAULT 0,
        stiftelsesdato                  TEXT,
        registreringsdato               TEXT,
        -- Berikelse (fylles inn av virksomheten selv)
        hjemmeside                      TEXT,
        epost                           TEXT,
        telefon                         TEXT,
        beskrivelse                     TEXT,
        spesialiteter                   TEXT DEFAULT '[]',
        bilde_url                       TEXT,
        -- Markedsplass-metadata
        godkjent_for_visning            INTEGER DEFAULT 1,
        featured                        INTEGER DEFAULT 0,
        profil_krevd                    INTEGER DEFAULT 0,
        opprettet_i_db                  TEXT DEFAULT (datetime('now')),
        sist_oppdatert_i_db             TEXT DEFAULT (datetime('now')),
        brreg_json                      TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_kommune    ON fysioterapeuter(kommune);
    CREATE INDEX IF NOT EXISTS idx_fylke      ON fysioterapeuter(fylke);
    CREATE INDEX IF NOT EXISTS idx_postnummer ON fysioterapeuter(postnummer);
    CREATE INDEX IF NOT EXISTS idx_navn       ON fysioterapeuter(navn COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_geo        ON fysioterapeuter(lat, lon);
    CREATE INDEX IF NOT EXISTS idx_status     ON fysioterapeuter(godkjent_for_visning, konkurs, under_avvikling);

    CREATE TABLE IF NOT EXISTS import_logg (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        kjoert           TEXT DEFAULT (datetime('now')),
        naeringskode     TEXT,
        antall_hentet    INTEGER,
        antall_nye       INTEGER,
        antall_oppdatert INTEGER,
        status           TEXT,
        melding          TEXT
    );
    """)
    conn.commit()
    log.info(f"Database klar: {db_path}")
    return conn


# ── API-henting ───────────────────────────────
def hent_side(naeringskode: str, side: int, session: requests.Session) -> dict:
    for forsok in range(3):
        try:
            resp = session.get(
                f"{API_BASE}/enheter",
                params={"naeringskode": naeringskode, "size": PAGE_SIZE, "page": side},
                headers={"Accept": "application/json",
                         "User-Agent": "FysioterapiMarkedsplass/1.0"},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            log.warning(f"Side {side}, forsøk {forsok+1}: {e}")
            time.sleep(2 ** forsok)
    raise RuntimeError(f"Kunne ikke hente side {side}")


def hent_alle(naeringskode: str) -> list[dict]:
    session = requests.Session()
    alle, side = [], 0
    log.info(f"Henter næringskode {naeringskode} ...")
    while True:
        data = hent_side(naeringskode, side, session)
        page = data.get("page", {})
        total_sider = page.get("totalPages", 1)
        total = page.get("totalElements", 0)
        if side == 0:
            log.info(f"  {total} enheter, {total_sider} sider")
        enheter = data.get("_embedded", {}).get("enheter", [])
        if not enheter:
            break
        alle.extend(enheter)
        log.info(f"  Side {side+1}/{total_sider} ({len(alle)} totalt)")
        side += 1
        if side >= total_sider:
            break
        time.sleep(0.3)
    return alle


# ── Lagring ───────────────────────────────────
def parse_enhet(e: dict) -> dict:
    adr = e.get("forretningsadresse") or e.get("postadresse") or {}
    linjer = [x for x in (adr.get("adresse") or []) if x]
    kommunenr = adr.get("kommunenummer")
    nk1 = e.get("naeringskode1") or {}
    nk2 = e.get("naeringskode2") or {}
    orgform = e.get("organisasjonsform") or {}
    return {
        "organisasjonsnummer": e.get("organisasjonsnummer"),
        "navn": (e.get("navn") or "").strip(),
        "organisasjonsform_kode": orgform.get("kode"),
        "organisasjonsform_beskrivelse": orgform.get("beskrivelse"),
        "naeringskode1": nk1.get("kode"),
        "naeringskode1_beskrivelse": nk1.get("beskrivelse"),
        "adresse": ", ".join(linjer) or None,
        "postnummer": adr.get("postnummer"),
        "poststed": adr.get("poststed"),
        "kommune": adr.get("kommune"),
        "kommunenummer": kommunenr,
        "fylke": FYLKER.get((kommunenr or "")[:2]),
        "landkode": adr.get("landkode", "NO"),
        "antall_ansatte": e.get("antallAnsatte"),
        "registrert_i_mva": 1 if e.get("registrertIMvaregisteret") else 0,
        "konkurs": 1 if e.get("konkurs") else 0,
        "under_avvikling": 1 if e.get("underAvvikling") else 0,
        "stiftelsesdato": e.get("stiftelsesdato"),
        "registreringsdato": e.get("registreringsdatoEnhetsregisteret"),
        "sist_oppdatert_i_db": datetime.now().isoformat(),
        "brreg_json": json.dumps(e, ensure_ascii=False),
    }


def lagre(conn: sqlite3.Connection, enheter: list[dict]) -> tuple[int, int]:
    cur = conn.cursor()
    nye = oppdaterte = 0
    for e in enheter:
        rad = parse_enhet(e)
        if not rad["organisasjonsnummer"]:
            continue
        cur.execute("SELECT id FROM fysioterapeuter WHERE organisasjonsnummer = ?",
                    (rad["organisasjonsnummer"],))
        if cur.fetchone():
            set_clause = ", ".join(f"{k} = :{k}" for k in rad if k != "organisasjonsnummer")
            cur.execute(f"UPDATE fysioterapeuter SET {set_clause} "
                        f"WHERE organisasjonsnummer = :organisasjonsnummer", rad)
            oppdaterte += 1
        else:
            kolonner = ", ".join(rad.keys())
            ph = ", ".join(f":{k}" for k in rad.keys())
            cur.execute(f"INSERT INTO fysioterapeuter ({kolonner}) VALUES ({ph})", rad)
            nye += 1
    conn.commit()
    return nye, oppdaterte


# ── Statistikk ────────────────────────────────
def skriv_statistikk(conn: sqlite3.Connection):
    cur = conn.cursor()
    totalt = conn.execute("SELECT COUNT(*) FROM fysioterapeuter").fetchone()[0]
    aktive = conn.execute(
        "SELECT COUNT(*) FROM fysioterapeuter WHERE konkurs=0 AND under_avvikling=0"
    ).fetchone()[0]

    print(f"\n{'═'*52}")
    print(f"  FYSIOTERAPEUTER I NORGE – BRREG-DATA")
    print(f"{'═'*52}")
    print(f"  Totalt i DB:    {totalt}")
    print(f"  Aktive:         {aktive}")

    print("\n  Topp 10 kommuner:")
    for r in cur.execute("""
        SELECT kommune, COUNT(*) n FROM fysioterapeuter
        WHERE konkurs=0 AND under_avvikling=0
        GROUP BY kommune ORDER BY n DESC LIMIT 10
    """):
        print(f"    {(r[0] or 'Ukjent'):<26} {r[1]:>4}")

    print("\n  Per fylke:")
    for r in cur.execute("""
        SELECT COALESCE(fylke,'Ukjent') f, COUNT(*) n FROM fysioterapeuter
        WHERE konkurs=0 AND under_avvikling=0
        GROUP BY f ORDER BY n DESC
    """):
        print(f"    {r[0]:<26} {r[1]:>4}")
    print(f"{'═'*52}\n")


# ── Hovedprogram ──────────────────────────────
def main():
    print(f"\n{'═'*52}")
    print(f"  BRREG Fysioterapeut-henter  –  {datetime.now():%Y-%m-%d %H:%M}")
    print(f"{'═'*52}\n")

    conn = opprett_database(DB_PATH)
    total_nye = total_oppdaterte = 0

    for kode in NAERINGSKODER:
        try:
            enheter = hent_alle(kode)
            nye, oppdaterte = lagre(conn, enheter)
            total_nye += nye
            total_oppdaterte += oppdaterte
            conn.execute(
                "INSERT INTO import_logg (naeringskode,antall_hentet,antall_nye,antall_oppdatert,status) "
                "VALUES (?,?,?,?,'OK')", (kode, len(enheter), nye, oppdaterte)
            )
            conn.commit()
            log.info(f"  {kode}: {nye} nye, {oppdaterte} oppdatert")
        except Exception as ex:
            log.error(f"Feil: {ex}")
            conn.execute(
                "INSERT INTO import_logg (naeringskode,antall_hentet,antall_nye,antall_oppdatert,status,melding) "
                "VALUES (?,0,0,0,'FEIL',?)", (kode, str(ex))
            )
            conn.commit()

    print(f"\n✅  Ferdig! {total_nye} nye + {total_oppdaterte} oppdatert")
    skriv_statistikk(conn)
    print(f"Database: {DB_PATH.resolve()}\n")
    conn.close()


if __name__ == "__main__":
    main()
