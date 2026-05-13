"""
backend/main.py  –  FastAPI REST-API for fysioterapeut-markedsplassen
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from database import get_db, search_fysioterapeuter, get_by_orgnr, get_statistikk, get_geo_resultater
from models import FysioterapeutUpdate, FysioterapeutResponse, SearchResponse, Statistikk

app = FastAPI(
    title="Fysioterapeut Markedsplass API",
    description="API for norsk markedsplass for fysioterapeuter – data fra BRREG",
    version="1.0.0",
)

import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY", "")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "PUT", "POST"],
    allow_headers=["*"],
)

# ── Hjelpefunksjoner ──────────────────────────────────────────────────────────

def _ensure_verifisering_tabell(conn):
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS verifisering_tokens (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        orgnr       TEXT NOT NULL,
        token_hash  TEXT NOT NULL UNIQUE,
        epost       TEXT NOT NULL,
        utloper     TEXT NOT NULL,
        brukt       INTEGER DEFAULT 0,
        opprettet   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS eier_sesjoner (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        orgnr       TEXT NOT NULL,
        epost       TEXT NOT NULL,
        sesjon_hash TEXT NOT NULL UNIQUE,
        utloper     TEXT DEFAULT (datetime('now', '+30 days')),
        opprettet   TEXT DEFAULT (datetime('now'))
    );
    """)
    conn.commit()


def _hash(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


# ── Søk ───────────────────────────────────────────────────────────────────────

@app.get("/api/fysioterapeuter", response_model=SearchResponse, tags=["Søk"])
def sok_fysioterapeuter(
    q: str | None = Query(None),
    kommune: str | None = Query(None),
    fylke: str | None = Query(None),
    postnummer: str | None = Query(None),
    spesialitet: str | None = Query(None),
    kun_aktive: bool = Query(True),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
):
    with get_db() as conn:
        rader, totalt = search_fysioterapeuter(
            conn, q=q, kommune=kommune, fylke=fylke,
            postnummer=postnummer, spesialitet=spesialitet,
            kun_aktive=kun_aktive, page=page, size=size,
        )
        return {"resultater": rader, "totalt": totalt, "side": page,
                "sider": (totalt + size - 1) // size if totalt else 0}


@app.get("/api/kart", tags=["Søk"])
def kart_data(
    q: str | None = Query(None),
    kommune: str | None = Query(None),
    fylke: str | None = Query(None),
    size: int = Query(500, ge=1, le=7000),
):
    """Returnerer alle resultater med koordinater for kartet."""
    with get_db() as conn:
        return get_geo_resultater(conn, q=q, kommune=kommune, fylke=fylke, size=size)


@app.get("/api/fysioterapeuter/{orgnr}", response_model=FysioterapeutResponse, tags=["Profil"])
def hent_fysioterapeut(orgnr: str):
    with get_db() as conn:
        rad = get_by_orgnr(conn, orgnr)
        if not rad:
            raise HTTPException(404, detail=f"Fant ikke {orgnr}")
        return rad


@app.put("/api/fysioterapeuter/{orgnr}", tags=["Profil"])
def oppdater_profil(
    orgnr: str,
    data: FysioterapeutUpdate,
    x_sesjon_token: str | None = Header(None),
):
    """Oppdater profil. Krever gyldig sesjon-token fra eierverifisering."""
    import json
    with get_db() as conn:
        _ensure_verifisering_tabell(conn)

        # Sesjon-token er påkrevd for å redigere profil
        if not x_sesjon_token:
            raise HTTPException(401, detail="Sesjon-token mangler. Verifiser eierskap først.")
        rad = conn.execute(
            "SELECT orgnr FROM eier_sesjoner WHERE sesjon_hash=? AND orgnr=? AND utloper > datetime('now')",
            (_hash(x_sesjon_token), orgnr)
        ).fetchone()
        if not rad:
            raise HTTPException(401, detail="Ugyldig eller utløpt sesjon")

        existing = get_by_orgnr(conn, orgnr)
        if not existing:
            raise HTTPException(404, detail=f"Fant ikke {orgnr}")

        oppdateringer = data.model_dump(exclude_none=True)
        if "spesialiteter" in oppdateringer:
            oppdateringer["spesialiteter"] = json.dumps(oppdateringer["spesialiteter"])
        oppdateringer["sist_oppdatert_i_db"] = datetime.now().isoformat()
        set_clause = ", ".join(f"{k} = :{k}" for k in oppdateringer)
        oppdateringer["orgnr"] = orgnr
        conn.execute(f"UPDATE fysioterapeuter SET {set_clause} WHERE organisasjonsnummer = :orgnr", oppdateringer)
        conn.commit()
        return {"status": "ok", "organisasjonsnummer": orgnr}


# ── Eierverifisering ──────────────────────────────────────────────────────────

@app.post("/api/krev-profil/{orgnr}", tags=["Verifisering"])
def krev_profil(orgnr: str):
    """
    Sender magic link til BRREG-registrert e-post.
    I dev returneres lenken direkte i svaret (merk: i produksjon sendes den på e-post).
    """
    with get_db() as conn:
        _ensure_verifisering_tabell(conn)

        rad = conn.execute(
            "SELECT navn, brreg_epost FROM fysioterapeuter WHERE organisasjonsnummer = ?", (orgnr,)
        ).fetchone()
        if not rad:
            raise HTTPException(404, detail=f"Fant ikke {orgnr}")

        brreg_epost = rad["brreg_epost"]
        if not brreg_epost:
            raise HTTPException(400, detail={
                "kode": "ingen_brreg_epost",
                "melding": "Denne bedriften har ikke registrert e-post i Brønnøysundregistrene. "
                           "Registrer e-post på brreg.no og prøv igjen, eller kontakt oss for manuell verifisering."
            })

        # Generer token
        token = secrets.token_urlsafe(32)
        utloper = (datetime.now() + timedelta(hours=24)).isoformat()
        conn.execute(
            "INSERT INTO verifisering_tokens (orgnr, token_hash, epost, utloper) VALUES (?,?,?,?)",
            (orgnr, _hash(token), brreg_epost, utloper)
        )
        conn.commit()

        lenke = f"{FRONTEND_URL}/verifiser/{token}"
        dev_mode = os.environ.get("DEV_MODE", "true").lower() == "true"

        if not dev_mode:
            _send_verifiserings_epost(
                til=brreg_epost,
                navn=rad["navn"],
                lenke=lenke,
            )

        return {
            "status": "ok",
            "navn": rad["navn"],
            "epost_maskert": _masker_epost(brreg_epost),
            **({"lenke_dev": f"/verifiser/{token}"} if dev_mode else {}),
            "melding": f"En bekreftelseslenke er sendt til {_masker_epost(brreg_epost)}. Lenken er gyldig i 24 timer.",
        }


@app.get("/api/verifiser/{token}", tags=["Verifisering"])
def verifiser_token(token: str):
    """Validerer magic link og returnerer sesjon-token."""
    with get_db() as conn:
        _ensure_verifisering_tabell(conn)

        rad = conn.execute(
            "SELECT id, orgnr, epost FROM verifisering_tokens "
            "WHERE token_hash=? AND brukt=0 AND utloper > datetime('now')",
            (_hash(token),)
        ).fetchone()

        if not rad:
            raise HTTPException(400, detail="Lenken er ugyldig eller utløpt.")

        # Merk token som brukt
        conn.execute("UPDATE verifisering_tokens SET brukt=1 WHERE id=?", (rad["id"],))

        # Opprett sesjon
        sesjon_token = secrets.token_urlsafe(32)
        conn.execute(
            "INSERT INTO eier_sesjoner (orgnr, epost, sesjon_hash) VALUES (?,?,?)",
            (rad["orgnr"], rad["epost"], _hash(sesjon_token))
        )
        conn.commit()

        bedrift = conn.execute(
            "SELECT navn FROM fysioterapeuter WHERE organisasjonsnummer=?", (rad["orgnr"],)
        ).fetchone()

        return {
            "status": "ok",
            "orgnr": rad["orgnr"],
            "navn": bedrift["navn"] if bedrift else "",
            "epost": rad["epost"],
            "sesjon_token": sesjon_token,
            "utloper_dager": 30,
        }


@app.get("/api/meg", tags=["Verifisering"])
def hent_meg(x_sesjon_token: str | None = Header(None)):
    """Returnerer innlogget eier basert på sesjon-token."""
    if not x_sesjon_token:
        raise HTTPException(401, detail="Ikke innlogget")
    with get_db() as conn:
        _ensure_verifisering_tabell(conn)
        rad = conn.execute(
            "SELECT orgnr, epost FROM eier_sesjoner WHERE sesjon_hash=? AND utloper > datetime('now')",
            (_hash(x_sesjon_token),)
        ).fetchone()
        if not rad:
            raise HTTPException(401, detail="Ugyldig eller utløpt sesjon")
        return {"orgnr": rad["orgnr"], "epost": rad["epost"]}


# ── Statistikk ────────────────────────────────────────────────────────────────

@app.get("/api/kommuner", tags=["Statistikk"])
def hent_kommuner(fylke: str | None = None):
    with get_db() as conn:
        sql = "SELECT kommune, COUNT(*) antall FROM fysioterapeuter WHERE konkurs=0 AND under_avvikling=0 AND kommune IS NOT NULL"
        params = []
        if fylke:
            sql += " AND fylke = ?"; params.append(fylke)
        sql += " GROUP BY kommune ORDER BY antall DESC"
        return [dict(r) for r in conn.execute(sql, params).fetchall()]


@app.get("/api/fylker", tags=["Statistikk"])
def hent_fylker():
    with get_db() as conn:
        return [dict(r) for r in conn.execute("""
            SELECT COALESCE(fylke,'Ukjent') fylke, COUNT(*) antall
            FROM fysioterapeuter WHERE konkurs=0 AND under_avvikling=0
            GROUP BY fylke ORDER BY antall DESC
        """).fetchall()]


@app.get("/api/statistikk", response_model=Statistikk, tags=["Statistikk"])
def hent_statistikk():
    with get_db() as conn:
        return get_statistikk(conn)


@app.get("/health")
def health():
    return {"status": "ok"}


# ── Hjelpefunksjoner ──────────────────────────────────────────────────────────

def _send_verifiserings_epost(til: str, navn: str, lenke: str):
    resend.Emails.send({
        "from": "Finn Fysioterapeut <noreply@finnfysioterapeut.no>",
        "to": [til],
        "subject": f"Bekreft eierskap av {navn}",
        "html": f"""
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
          <div style="margin-bottom:24px">
            <span style="background:#0F7A49;color:#fff;font-weight:700;padding:6px 12px;border-radius:6px;font-size:14px">
              Finn Fysioterapeut
            </span>
          </div>
          <h1 style="font-size:22px;color:#0A1C10;margin:0 0 12px">Bekreft eierskap av {navn}</h1>
          <p style="color:#2C5038;line-height:1.6;margin:0 0 24px">
            Vi mottok en forespørsel om å knytte denne profilen til din konto.
            Klikk på knappen nedenfor for å bekrefte at du er eier av klinikken.
          </p>
          <a href="{lenke}"
             style="display:inline-block;background:#0F7A49;color:#fff;font-weight:600;
                    padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px">
            Bekreft eierskap →
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#666;line-height:1.6">
            Lenken er gyldig i 24 timer. Hvis du ikke har sendt denne forespørselen, kan du ignorere denne e-posten.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="font-size:12px;color:#999;margin:0">
            Finn Fysioterapeut · Åpne data fra Brønnøysundregistrene
          </p>
        </div>
        """,
    })


def _masker_epost(epost: str) -> str:
    if "@" not in epost:
        return epost
    bruker, domene = epost.split("@", 1)
    skjult = bruker[:2] + "*" * max(0, len(bruker) - 2)
    return f"{skjult}@{domene}"
