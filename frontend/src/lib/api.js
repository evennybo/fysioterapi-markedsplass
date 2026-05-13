// src/lib/api.js  –  Klient mot FastAPI-backend

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export async function sokFysioterapeuter(params = {}) {
  const url = new URL(`${BASE}/fysioterapeuter`, window.location.origin)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API-feil: ${res.status}`)
  return res.json()
}

export async function hentFysioterapeut(orgnr) {
  const res = await fetch(`${BASE}/fysioterapeuter/${orgnr}`)
  if (!res.ok) throw new Error(`Fant ikke ${orgnr}`)
  return res.json()
}

export async function hentFylker() {
  const res = await fetch(`${BASE}/fylker`)
  return res.json()
}

export async function hentKommuner(fylke) {
  const url = new URL(`${BASE}/kommuner`, window.location.origin)
  if (fylke) url.searchParams.set('fylke', fylke)
  const res = await fetch(url)
  return res.json()
}

export async function hentStatistikk() {
  const res = await fetch(`${BASE}/statistikk`)
  return res.json()
}

export async function oppdaterProfil(orgnr, data, sesjonToken) {
  const headers = { 'Content-Type': 'application/json' }
  if (sesjonToken) headers['x-sesjon-token'] = sesjonToken
  const res = await fetch(`${BASE}/fysioterapeuter/${orgnr}`, {
    method: 'PUT', headers, body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Lagring feilet: ${res.status}`)
  return res.json()
}
