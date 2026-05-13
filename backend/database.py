"""
backend/database.py  –  SQLite-tilkobling og spørringer
"""

import sqlite3
import json
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent / "fysioterapeuter.db"


@contextmanager
def get_db():
    if not DB_PATH.exists():
        raise RuntimeError(
            f"Databasen finnes ikke: {DB_PATH}\n"
            "Kjør først:  cd scripts && python hent_data.py"
        )
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def row_to_dict(row) -> dict:
    d = dict(row)
    if "spesialiteter" in d and isinstance(d["spesialiteter"], str):
        try:
            d["spesialiteter"] = json.loads(d["spesialiteter"])
        except Exception:
            d["spesialiteter"] = []
    if "brreg_json" in d:
        del d["brreg_json"]   # ikke eksponer rådata
    return d


def _upper(s: str) -> str:
    """Normaliser til uppercase inkl. norske tegn for LIKE-søk."""
    return s.upper().replace("Ø", "Ø").replace("Æ", "Æ").replace("Å", "Å")


def search_fysioterapeuter(
    conn,
    q: str | None = None,
    kommune: str | None = None,
    fylke: str | None = None,
    postnummer: str | None = None,
    spesialitet: str | None = None,
    kun_aktive: bool = True,
    page: int = 0,
    size: int = 20,
) -> tuple[list[dict], int]:
    where, params = [], []

    if kun_aktive:
        where.append("konkurs = 0 AND under_avvikling = 0")

    if q:
        q_upper = f"%{_upper(q)}%"
        # Søk i navn, poststed, kommune, adresse og aktivitetsbeskrivelse
        where.append("""(
            UPPER(navn)     LIKE ?
            OR UPPER(poststed)  LIKE ?
            OR UPPER(kommune)   LIKE ?
            OR UPPER(adresse)   LIKE ?
            OR UPPER(COALESCE(aktivitet,''))  LIKE ?
            OR UPPER(COALESCE(beskrivelse,'')) LIKE ?
        )""")
        params.extend([q_upper] * 6)

    if kommune:
        where.append("UPPER(kommune) = UPPER(?)")
        params.append(kommune)

    if fylke:
        where.append("UPPER(fylke) = UPPER(?)")
        params.append(fylke)

    if postnummer:
        where.append("postnummer = ?")
        params.append(postnummer)

    if spesialitet:
        where.append("spesialiteter LIKE ?")
        params.append(f'%"{spesialitet}"%')

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    total = conn.execute(
        f"SELECT COUNT(*) FROM fysioterapeuter {where_sql}", params
    ).fetchone()[0]

    rader = conn.execute(
        f"""
        SELECT organisasjonsnummer, navn, adresse, postnummer, poststed,
               kommune, fylke, lat, lon, antall_ansatte,
               organisasjonsform_kode, organisasjonsform_beskrivelse,
               naeringskode1, naeringskode1_beskrivelse,
               hjemmeside, epost, telefon, beskrivelse, spesialiteter,
               bilde_url, brreg_epost, brreg_mobil, brreg_hjemmeside, aktivitet,
               konkurs, under_avvikling, stiftelsesdato,
               godkjent_for_visning, featured
        FROM fysioterapeuter
        {where_sql}
        ORDER BY featured DESC, navn ASC
        LIMIT ? OFFSET ?
        """,
        params + [size, page * size],
    ).fetchall()

    return [row_to_dict(r) for r in rader], total


def get_by_orgnr(conn, orgnr: str) -> dict | None:
    rad = conn.execute(
        """
        SELECT organisasjonsnummer, navn, adresse, postnummer, poststed,
               kommune, fylke, lat, lon, antall_ansatte,
               organisasjonsform_kode, organisasjonsform_beskrivelse,
               naeringskode1, naeringskode1_beskrivelse,
               hjemmeside, epost, telefon, beskrivelse, spesialiteter,
               bilde_url, brreg_epost, brreg_mobil, brreg_hjemmeside, aktivitet,
               konkurs, under_avvikling, stiftelsesdato,
               registreringsdato, registrert_i_mva,
               godkjent_for_visning, featured, opprettet_i_db, sist_oppdatert_i_db
        FROM fysioterapeuter
        WHERE organisasjonsnummer = ?
        """,
        (orgnr,),
    ).fetchone()
    return row_to_dict(rad) if rad else None


def get_geo_resultater(conn, q=None, kommune=None, fylke=None, size=200) -> list[dict]:
    """Henter alle resultater med koordinater for kartet (maks size)."""
    where, params = ["lat IS NOT NULL", "lon IS NOT NULL", "konkurs=0", "under_avvikling=0"], []
    if q:
        q_upper = f"%{_upper(q)}%"
        where.append("(UPPER(navn) LIKE ? OR UPPER(poststed) LIKE ? OR UPPER(kommune) LIKE ?)")
        params.extend([q_upper, q_upper, q_upper])
    if kommune:
        where.append("UPPER(kommune) = UPPER(?)"); params.append(kommune)
    if fylke:
        where.append("UPPER(fylke) = UPPER(?)"); params.append(fylke)
    rader = conn.execute(
        f"SELECT organisasjonsnummer, navn, adresse, postnummer, poststed, kommune, fylke, lat, lon, telefon, brreg_mobil, hjemmeside, brreg_hjemmeside "
        f"FROM fysioterapeuter WHERE {' AND '.join(where)} ORDER BY featured DESC LIMIT ?",
        params + [size]
    ).fetchall()
    return [dict(r) for r in rader]


def get_statistikk(conn) -> dict:
    totalt = conn.execute("SELECT COUNT(*) FROM fysioterapeuter").fetchone()[0]
    aktive = conn.execute(
        "SELECT COUNT(*) FROM fysioterapeuter WHERE konkurs=0 AND under_avvikling=0"
    ).fetchone()[0]
    med_profil = conn.execute(
        "SELECT COUNT(*) FROM fysioterapeuter WHERE hjemmeside IS NOT NULL OR epost IS NOT NULL"
    ).fetchone()[0]
    kommuner = conn.execute(
        "SELECT COUNT(DISTINCT kommune) FROM fysioterapeuter WHERE konkurs=0"
    ).fetchone()[0]

    return {
        "totalt": totalt,
        "aktive": aktive,
        "med_utvidet_profil": med_profil,
        "kommuner_representert": kommuner,
    }
