// src/pages/SokSide.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { sokFysioterapeuter, hentFylker, hentKommuner, hentStatistikk } from '../lib/api.js'
import { Nav, Footer, Tag, Icon, FaqAccordion } from '../components/shared.jsx'
import { genererSEOInnhold, GENERELL_FAQ } from '../lib/seoContent.js'
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

// ── Leaflet-kart ──────────────────────────────────────────────────────────────
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
  const erVerifisert = !!(f.beskrivelse || f.epost || f.telefon || f.hjemmeside || f.bilde_url || f.spesialiteter?.length)
  return (
    <Link to={`/fysioterapeut/${f.organisasjonsnummer}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        className="card card-hover"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14,
          borderLeft: erVerifisert ? '3px solid var(--accent)' : undefined,
        }}
      >
        {/* Profilbilde */}
        {f.bilde_url && (
          <img
            src={f.bilde_url}
            alt={f.navn}
            style={{ width: 52, height: 52, borderRadius: 'var(--r-sm)', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: kompakt ? '.9rem' : '1rem', fontWeight: 700, fontFamily: 'var(--font-d)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
              {f.navn}
            </h2>
            {erVerifisert && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '.7rem', background: 'rgba(15,122,73,0.1)', color: 'var(--accent)', borderRadius: 99, padding: '2px 8px', fontWeight: 700, flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Utfylt profil
              </span>
            )}
          </div>
          <p style={{ margin: '0 0 6px', fontSize: '.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="pin" size={13} color="var(--muted)" />
            {[f.adresse, f.postnummer && f.poststed ? `${f.postnummer} ${f.poststed}` : f.poststed, f.kommune !== f.poststed ? f.kommune : null].filter(Boolean).join(' · ')}
          </p>
          {f.beskrivelse && !kompakt && (
            <p style={{ margin: '0 0 8px', fontSize: '.82rem', color: 'var(--muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {f.beskrivelse}
            </p>
          )}
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

// ── SEO-innholdseksjon ────────────────────────────────────────────────────────
function SEOSeksjon({ seo, totalt }) {
  const { stedInnhold, specInnhold, harSted, harSpec, sted, spesialitet } = seo
  if (!harSted && !harSpec) return null

  return (
    <div style={{ marginTop: 64, borderTop: '1px solid var(--border)', paddingTop: 48 }}>

      {/* Sted-seksjon */}
      {harSted && stedInnhold && (
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', fontWeight: 700, color: 'var(--text)', margin: '0 0 16px', letterSpacing: '-.01em' }}>
            Om fysioterapi i {sted}
          </h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.75, fontSize: '.95rem', maxWidth: 720, margin: '0 0 24px' }}>
            {stedInnhold.intro}
          </p>
          {stedInnhold.fakta && (
            <p style={{ color: 'var(--muted)', lineHeight: 1.75, fontSize: '.95rem', maxWidth: 720, margin: '0 0 24px' }}>
              {stedInnhold.fakta}
            </p>
          )}

          {/* Bydeler (Oslo) */}
          {stedInnhold.bydeler && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
                Finn fysioterapeut i din bydel
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {stedInnhold.bydeler.map(b => (
                  <a
                    key={b}
                    href={`/sok?q=${encodeURIComponent(b)}`}
                    style={{ padding: '6px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 99, fontSize: '.82rem', fontWeight: 600, color: 'var(--text)', textDecoration: 'none', transition: 'border-color .15s' }}
                    onMouseEnter={e => e.target.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
                  >
                    {b}
                  </a>
                ))}
              </div>
            </div>
          )}

          <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
            Slik finner du riktig fysioterapeut i {sted}
          </h3>
          <ul style={{ color: 'var(--muted)', lineHeight: 1.8, fontSize: '.92rem', paddingLeft: 20, margin: '0 0 16px' }}>
            <li>Sjekk om klinikken har den spesialiteten du trenger</li>
            <li>Se på antall ansatte – større klinikker har gjerne bredere tilbud</li>
            <li>Vurder avstand og kollektivtilgang</li>
            <li>Ring og spør om ventetid – mange tilbyr rask time</li>
          </ul>
          <p style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
            Kilde: <a href="https://www.fysio.no" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Norsk Fysioterapeutforbund (NFF)</a>
            {' · '}
            <a href="https://snl.no/fysioterapi" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Store norske leksikon – Fysioterapi</a>
          </p>
        </section>
      )}

      {/* Spesialitet-seksjon */}
      {harSpec && specInnhold && (
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', fontWeight: 700, color: 'var(--text)', margin: '0 0 16px', letterSpacing: '-.01em' }}>
            Hva er {spesialitet.toLowerCase()}?
          </h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.75, fontSize: '.95rem', maxWidth: 720, margin: '0 0 24px' }}>
            {specInnhold.hva}
          </p>

          <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
            Når bør du oppsøke hjelp?
          </h3>
          <p style={{ color: 'var(--muted)', lineHeight: 1.75, fontSize: '.92rem', maxWidth: 720, margin: '0 0 24px' }}>
            {specInnhold.nar}
          </p>

          <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
            Vanlige behandlingsmetoder
          </h3>
          <ul style={{ color: 'var(--muted)', lineHeight: 1.8, fontSize: '.92rem', paddingLeft: 20, margin: '0 0 16px' }}>
            {specInnhold.behandling.map(b => <li key={b}>{b}</li>)}
          </ul>

          {specInnhold.kilde && (
            <p style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
              Les mer: <a href={specInnhold.kilde.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{specInnhold.kilde.tekst}</a>
              {' · '}
              <a href={`https://snl.no/${encodeURIComponent(spesialitet.toLowerCase().replace(/ /g, '_'))}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Store norske leksikon</a>
            </p>
          )}
        </section>
      )}

      {/* FAQ */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', fontWeight: 700, color: 'var(--text)', margin: '0 0 20px', letterSpacing: '-.01em' }}>
          Ofte stilte spørsmål
        </h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0 20px' }}>
            <FaqAccordion items={GENERELL_FAQ} />
          </div>
        </div>
      </section>

      {/* Om datakilde */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
          Om datagrunnlaget
        </h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.75, fontSize: '.88rem', maxWidth: 680 }}>
          Oversikten viser {totalt > 0 ? `${totalt.toLocaleString('no')} klinikker` : 'alle klinikker'} registrert med næringskode 86.950 (Fysioterapi- og ergoterapitjenester) i{' '}
          <a href="https://www.brreg.no" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Brønnøysundregistrene</a>.
          Data oppdateres jevnlig og er lisensiert under{' '}
          <a href="https://data.norge.no/nlod/no/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Norsk lisens for offentlige data (NLOD)</a>.
        </p>
      </section>
    </div>
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
  const [visning, setVisning]       = useState('liste')

  const [q, setQ]             = useState(searchParams.get('q') || '')
  const [fylke, setFylke]     = useState(searchParams.get('fylke') || '')
  const [kommune, setKommune] = useState(searchParams.get('kommune') || '')
  const [spesialitet, setSpesialitet] = useState(searchParams.get('spesialitet') || '')

  const [debouncedQ, setDebouncedQ]             = useState(q)
  const [debouncedKommune, setDebouncedKommune] = useState(kommune)
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 300); return () => clearTimeout(t) }, [q])
  useEffect(() => { const t = setTimeout(() => setDebouncedKommune(kommune), 300); return () => clearTimeout(t) }, [kommune])

  const seo = genererSEOInnhold({ q: debouncedQ, spesialitet, fylke, kommune: debouncedKommune })

  // Oppdater meta-tags + JSON-LD dynamisk
  useEffect(() => {
    const SITE = 'https://klinikkene.no'
    const tittel = `${seo.h1} | klinikkene.no`
    document.title = tittel

    const setOrCreate = (sel, attrs) => {
      let el = document.querySelector(sel)
      if (!el) { el = document.createElement('meta'); document.head.appendChild(el) }
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
    }

    setOrCreate('meta[name="description"]', { name: 'description', content: seo.metaDesc })
    setOrCreate('meta[property="og:title"]', { property: 'og:title', content: tittel })
    setOrCreate('meta[property="og:description"]', { property: 'og:description', content: seo.metaDesc })

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    const params = new URLSearchParams()
    if (debouncedQ) params.set('q', debouncedQ)
    if (fylke) params.set('fylke', fylke)
    if (debouncedKommune) params.set('kommune', debouncedKommune)
    if (spesialitet) params.set('spesialitet', spesialitet)
    canonical.href = params.toString() ? `${SITE}/sok?${params}` : `${SITE}/sok`

    // FAQPage JSON-LD
    const existing = document.getElementById('ld-json-sok')
    if (existing) existing.remove()
    const sc = document.createElement('script')
    sc.id = 'ld-json-sok'; sc.type = 'application/ld+json'
    sc.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: GENERELL_FAQ.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    })
    document.head.appendChild(sc)

    return () => {
      document.title = 'Finn Fysioterapeut i Norge – klinikkene.no'
      document.getElementById('ld-json-sok')?.remove()
    }
  }, [seo.h1, seo.metaDesc, debouncedQ, fylke, debouncedKommune, spesialitet])

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
  useEffect(() => { hentFylker().then(setFylker).catch(console.error) }, [])
  useEffect(() => { hentKommuner(fylke || undefined).then(setKommuner).catch(console.error) }, [fylke])

  const nullstill = () => { setQ(''); setFylke(''); setKommune(''); setSpesialitet('') }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav />

      {/* ── Sticky filterbar ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 0', position: 'sticky', top: 60, zIndex: 10 }}>
        <div className="wrap">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="inp" style={{ flex: '2 1 200px', maxWidth: 340 }} placeholder="Søk på navn eller sted..." value={q} onChange={e => setQ(e.target.value)} />
            <select className="inp" style={{ flex: '1 1 150px', maxWidth: 210 }} value={fylke} onChange={e => { setFylke(e.target.value); setKommune('') }}>
              <option value="">Alle fylker</option>
              {fylker.map(f => <option key={f.fylke} value={f.fylke}>{f.fylke} ({f.antall})</option>)}
            </select>
            <input className="inp" style={{ flex: '1 1 140px', maxWidth: 190 }} placeholder="Kommune..." value={kommune} onChange={e => setKommune(e.target.value)} list="kommuner-liste" />
            <datalist id="kommuner-liste">{kommuner.map(k => <option key={k.kommune} value={k.kommune} />)}</datalist>
            {(q || fylke || kommune || spesialitet) && (
              <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '.82rem', whiteSpace: 'nowrap' }} onClick={nullstill}>Nullstill</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Innhold ── */}
      <div className="wrap" style={{ padding: '24px 24px 0' }}>
        {/* H1 + kontroll-linje */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-.02em', color: 'var(--text)' }}>
              {seo.h1}
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
              <button key={mode} className={`vt-btn${visning === mode ? ' active' : ''}`} onClick={() => setVisning(mode)}>{label}</button>
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

            {/* SEO-innhold under resultater */}
            <SEOSeksjon seo={seo} totalt={totalt} />
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
