// src/pages/SokSide.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { sokFysioterapeuter, hentFylker, hentKommuner, hentStatistikk } from '../lib/api.js'
import { Nav, Footer, Tag, Icon } from '../components/shared.jsx'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

async function hentKartData({ q, fylke, kommune }) {
  const url = new URL(`${API_BASE}/kart`, window.location.origin)
  if (q) url.searchParams.set('q', q)
  if (fylke) url.searchParams.set('fylke', fylke)
  if (kommune) url.searchParams.set('kommune', kommune)
  url.searchParams.set('size', '7000')
  const res = await fetch(url)
  return res.json()
}

// ── Leaflet-kart med clustering ──────────────────────────────────────────────
function SokKart({ q, fylke, kommune }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const clusterRef = useRef(null)
  const [antall, setAntall] = useState(0)
  const [laster, setLaster] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { zoomControl: true })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current)
      mapRef.current.setView([64.5, 17.0], 5)
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    setLaster(true)
    hentKartData({ q, fylke, kommune }).then(data => {
      if (!mapRef.current) return
      if (clusterRef.current) { mapRef.current.removeLayer(clusterRef.current); clusterRef.current = null }
      const group = L.markerClusterGroup({
        maxClusterRadius: 50,
        iconCreateFunction: (cluster) => {
          const n = cluster.getChildCount()
          const size = n < 10 ? 36 : n < 50 ? 44 : 52
          return L.divIcon({
            html: `<div style="background:var(--accent,#0F7A49);color:white;border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${size < 40 ? 12 : 14}px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-family:'DM Sans',sans-serif">${n}</div>`,
            className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
          })
        },
      })
      data.forEach(f => {
        const telefon = f.telefon || f.brreg_mobil
        const popup = `
          <b style="font-family:'DM Sans',sans-serif;color:#0A1C10">${f.navn}</b><br>
          <span style="color:#2C5038;font-size:.82rem">${[f.adresse, f.poststed].filter(Boolean).join(', ')}</span>
          ${telefon ? `<br><span style="font-size:.82rem">${telefon}</span>` : ''}
          <br><a href="/fysioterapeut/${f.organisasjonsnummer}" style="color:var(--accent,#0F7A49);font-weight:600;font-size:.82rem">Se profil →</a>
        `
        L.marker([f.lat, f.lon]).bindPopup(popup).addTo(group)
      })
      mapRef.current.addLayer(group)
      clusterRef.current = group
      setAntall(data.length)
      if (data.length > 0 && (q || fylke || kommune)) {
        const bounds = L.latLngBounds(data.map(f => [f.lat, f.lon]))
        mapRef.current.fitBounds(bounds, { padding: [40, 40] })
      }
      mapRef.current.invalidateSize()
      setLaster(false)
    }).catch(() => setLaster(false))
  }, [q, fylke, kommune])

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 400 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 400 }} />
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '6px 12px', fontSize: '.8rem', color: 'var(--text)', fontWeight: 500, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
        {laster ? 'Laster ...' : `${antall.toLocaleString('no')} klinikker`}
      </div>
      <button
        onClick={() => {
          if (!navigator.geolocation || !mapRef.current) return
          navigator.geolocation.getCurrentPosition(pos => {
            mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 13)
          })
        }}
        style={{ position: 'absolute', top: 10, left: 50, zIndex: 1000, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '6px 12px', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
      >
        <Icon name="location" size={14} color="var(--accent)" /> Finn meg
      </button>
    </div>
  )
}

// ── Resultat-kort ─────────────────────────────────────────────────────────────
function ResultatKort({ f, kompakt }) {
  return (
    <Link to={`/fysioterapeut/${f.organisasjonsnummer}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card card-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: kompakt ? '.9rem' : '1rem', fontWeight: 700, fontFamily: 'var(--font-d)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
              {f.navn}
            </h2>
            <span style={{ fontSize: '.72rem', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', color: 'var(--text)', opacity: .6, flexShrink: 0 }}>
              {f.organisasjonsform_kode}
            </span>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: '.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="pin" size={13} color="var(--muted)" />
            {[f.adresse, f.postnummer && f.poststed ? `${f.postnummer} ${f.poststed}` : f.poststed, f.kommune !== f.poststed ? f.kommune : null].filter(Boolean).join(' · ')}
          </p>
          {f.spesialiteter?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {f.spesialiteter.slice(0, 3).map(s => <Tag key={s} label={s} />)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {f.antall_ansatte != null && (
            <div style={{ fontSize: '.78rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Icon name="employees" size={14} color="var(--muted)" />
              <strong style={{ color: 'var(--text)', fontSize: '1rem', fontFamily: 'var(--font-d)', fontWeight: 700 }}>{f.antall_ansatte}</strong>
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--accent)', fontWeight: 600 }}>Se profil →</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Søkeside ──────────────────────────────────────────────────────────────────
export default function SokSide() {
  const [searchParams] = useSearchParams()

  const [resultater, setResultater] = useState([])
  const [totalt, setTotalt]         = useState(0)
  const [side, setSide]             = useState(0)
  const [sider, setSider]           = useState(0)
  const [laster, setLaster]         = useState(false)
  const [fylker, setFylker]         = useState([])
  const [kommuner, setKommuner]     = useState([])
  const [statistikk, setStatistikk] = useState(null)
  const [visning, setVisning]       = useState('liste')

  const [q, setQ]             = useState(searchParams.get('q') || '')
  const [fylke, setFylke]     = useState(searchParams.get('fylke') || '')
  const [kommune, setKommune] = useState(searchParams.get('kommune') || '')
  const [spesialitet, setSpesialitet] = useState(searchParams.get('spesialitet') || '')

  // Debounced verdier
  const [debouncedQ, setDebouncedQ]             = useState(q)
  const [debouncedKommune, setDebouncedKommune] = useState(kommune)
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t) }, [q])
  useEffect(() => { const t = setTimeout(() => setDebouncedKommune(kommune), 300); return () => clearTimeout(t) }, [kommune])

  const sok = useCallback(async (nyeSide = 0) => {
    setLaster(true)
    try {
      const data = await sokFysioterapeuter({ q: debouncedQ, fylke, kommune: debouncedKommune, spesialitet, page: nyeSide, size: 20 })
      setResultater(data.resultater)
      setTotalt(data.totalt)
      setSide(data.side)
      setSider(data.sider)
    } catch (e) { console.error(e) }
    finally { setLaster(false) }
  }, [debouncedQ, fylke, debouncedKommune, spesialitet])

  useEffect(() => { sok(0); setSide(0) }, [debouncedQ, fylke, debouncedKommune, spesialitet])
  useEffect(() => {
    hentFylker().then(setFylker).catch(console.error)
    hentStatistikk().then(setStatistikk).catch(console.error)
  }, [])
  useEffect(() => {
    hentKommuner(fylke || undefined).then(setKommuner).catch(console.error)
  }, [fylke])

  useEffect(() => {
    if (kommune) document.title = `Fysioterapeuter i ${kommune} | Finn Fysioterapeut`
    else if (fylke) document.title = `Fysioterapeuter i ${fylke} | Finn Fysioterapeut`
    else if (spesialitet) document.title = `${spesialitet} – Fysioterapeuter | Finn Fysioterapeut`
    else document.title = 'Finn Fysioterapeut i Norge'
  }, [fylke, kommune, spesialitet])

  const listeVises = visning === 'liste' || visning === 'delt'
  const kartVises  = visning === 'kart'  || visning === 'delt'

  const nullstill = () => { setQ(''); setFylke(''); setKommune(''); setSpesialitet('') }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav />

      {/* ── Sticky filterbar ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 0', position: 'sticky', top: 60, zIndex: 10 }}>
        <div className="wrap">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="inp"
              style={{ flex: '2 1 200px', maxWidth: 340 }}
              placeholder="Søk på navn eller sted..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            <select className="inp" style={{ flex: '1 1 150px', maxWidth: 210 }} value={fylke} onChange={e => { setFylke(e.target.value); setKommune('') }}>
              <option value="">Alle fylker</option>
              {fylker.map(f => <option key={f.fylke} value={f.fylke}>{f.fylke} ({f.antall})</option>)}
            </select>
            <input
              className="inp"
              style={{ flex: '1 1 140px', maxWidth: 190 }}
              placeholder="Kommune..."
              value={kommune}
              onChange={e => setKommune(e.target.value)}
              list="kommuner-liste"
            />
            <datalist id="kommuner-liste">
              {kommuner.map(k => <option key={k.kommune} value={k.kommune} />)}
            </datalist>
            {(q || fylke || kommune || spesialitet) && (
              <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '.82rem', whiteSpace: 'nowrap' }} onClick={nullstill}>
                Nullstill
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Innhold ── */}
      <div className="wrap" style={{ padding: '24px 24px 0' }}>
        {/* Kontroll-linje */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-.01em', color: 'var(--text)' }}>
              {fylke ? `Fysioterapeuter i ${fylke}` : spesialitet ? spesialitet : 'Alle fysioterapeuter'}
            </h1>
            <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--muted)' }}>
              {laster ? 'Søker ...' : `${totalt.toLocaleString('no')} ${totalt === 1 ? 'klinikk' : 'klinikker'} funnet`}
              {fylke && <>{' · '}<span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setFylke('')}>{fylke} ×</span></>}
              {spesialitet && <>{' · '}<span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setSpesialitet('')}>{spesialitet} ×</span></>}
              {kommune && <>{' · '}<span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setKommune('')}>{kommune} ×</span></>}
            </p>
          </div>
          <div className="view-toggle">
            {[['liste', 'Liste'], ['delt', 'Liste + Kart'], ['kart', 'Kart']].map(([mode, label]) => (
              <button key={mode} className={`vt-btn${visning === mode ? ' active' : ''}`} onClick={() => setVisning(mode)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste-visning */}
        {visning === 'liste' && (
          <>
            <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
              {resultater.length === 0 && !laster ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)' }}>
                  <Icon name="search" size={36} color="var(--border)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 500, color: 'var(--text)' }}>Ingen klinikker funnet. Prøv et annet søk.</p>
                </div>
              ) : (
                resultater.map(f => <ResultatKort key={f.organisasjonsnummer} f={f} />)
              )}
            </div>
            {sider > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 40, alignItems: 'center' }}>
                <button className="btn btn-ghost" disabled={side === 0} onClick={() => { sok(side - 1); setSide(s => s - 1) }}>← Forrige</button>
                <span style={{ fontSize: '.85rem', color: 'var(--muted)', padding: '0 8px' }}>Side {side + 1} av {sider}</span>
                <button className="btn btn-ghost" disabled={side >= sider - 1} onClick={() => { sok(side + 1); setSide(s => s + 1) }}>Neste →</button>
              </div>
            )}
          </>
        )}

        {/* Delt visning */}
        {visning === 'delt' && (
          <div className="split-wrap" style={{ paddingBottom: 40 }}>
            <div className="list-scroll">
              {resultater.map(f => <ResultatKort key={f.organisasjonsnummer} f={f} kompakt />)}
              {sider > 1 && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '16px 0' }}>
                  <button className="btn btn-ghost" disabled={side === 0} onClick={() => { sok(side - 1); setSide(s => s - 1) }} style={{ fontSize: '.82rem', padding: '7px 14px' }}>← Forrige</button>
                  <span style={{ fontSize: '.82rem', color: 'var(--muted)', alignSelf: 'center' }}>{side + 1}/{sider}</span>
                  <button className="btn btn-ghost" disabled={side >= sider - 1} onClick={() => { sok(side + 1); setSide(s => s + 1) }} style={{ fontSize: '.82rem', padding: '7px 14px' }}>Neste →</button>
                </div>
              )}
            </div>
            <div className="map-sticky" style={{ height: 'calc(100vh - 200px)' }}>
              <SokKart q={debouncedQ} fylke={fylke} kommune={debouncedKommune} />
            </div>
          </div>
        )}

        {/* Kart-visning */}
        {visning === 'kart' && (
          <div style={{ borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 40, height: 600 }}>
            <SokKart q={debouncedQ} fylke={fylke} kommune={debouncedKommune} />
          </div>
        )}
      </div>

      {visning === 'liste' && <Footer />}
    </div>
  )
}
