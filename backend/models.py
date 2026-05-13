"""
backend/models.py  –  Pydantic-modeller for API
"""

from pydantic import BaseModel, HttpUrl
from typing import Optional


class FysioterapeutUpdate(BaseModel):
    hjemmeside: Optional[str] = None
    epost: Optional[str] = None
    telefon: Optional[str] = None
    beskrivelse: Optional[str] = None
    spesialiteter: Optional[list[str]] = None
    bilde_url: Optional[str] = None


class FysioterapeutResponse(BaseModel):
    organisasjonsnummer: str
    navn: str
    adresse: Optional[str] = None
    postnummer: Optional[str] = None
    poststed: Optional[str] = None
    kommune: Optional[str] = None
    fylke: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    antall_ansatte: Optional[int] = None
    organisasjonsform_kode: Optional[str] = None
    organisasjonsform_beskrivelse: Optional[str] = None
    naeringskode1: Optional[str] = None
    naeringskode1_beskrivelse: Optional[str] = None
    # Eier-utfylt kontaktinfo
    hjemmeside: Optional[str] = None
    epost: Optional[str] = None
    telefon: Optional[str] = None
    beskrivelse: Optional[str] = None
    spesialiteter: list[str] = []
    bilde_url: Optional[str] = None
    # BRREG-registrert kontaktinfo (forhåndsutfylt)
    brreg_epost: Optional[str] = None
    brreg_mobil: Optional[str] = None
    brreg_hjemmeside: Optional[str] = None
    aktivitet: Optional[str] = None
    konkurs: int = 0
    under_avvikling: int = 0
    stiftelsesdato: Optional[str] = None
    featured: int = 0

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    resultater: list[FysioterapeutResponse]
    totalt: int
    side: int
    sider: int


class Statistikk(BaseModel):
    totalt: int
    aktive: int
    med_utvidet_profil: int
    kommuner_representert: int
