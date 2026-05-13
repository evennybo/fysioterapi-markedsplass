// src/pages/ProfilSide.jsx
import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { hentFysioterapeut, oppdaterProfil } from '../lib/api.js'
import { Nav, Footer, Tag, Icon, SectionHead, FaqAccordion, QuickFacts } from '../components/shared.jsx'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SPESIALITETER_LISTE = [
  'Idrettsfysioterapi', 'Manuellterapi', 'Psykomotorisk fysioterapi',
  'Pediatri', 'Nevrologi', 'Skulder og nakke', 'Rygg og kors',
  'Kne og hofte', 'Hodepine', 'Svangerskap', 'Hjemmebesøk',
  'Arbeidsmedisin', 'Osteoporose', 'Kreft-rehabilitering',
]

// ── Kart ──────────────────────────────────────────────────────────────────────
function ProfilKart({ adresse, postnummer, poststed, kommune, lat, lon }) {
  const ref = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    const init = (la, lo) => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      const map = L.map(ref.current).setView([la, lo], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      L.marker([la, lo]).addTo(map).bindPopup(
        `<a href="https://www.google.com/maps/dir/?api=1&destination=${la},${lo}" target="_blank" rel="noreferrer" style="color:var(--accent,#0F7A49);font-weight:600">Få veibeskrivelse</a>`
      )
      mapRef.current = map
    }
    if (lat && lon) {
      init(lat, lon)
    } else {
      const q = [adresse, postnummer, poststed, kommune, 'Norge'].filter(Boolean).join(', ')
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=no`, { headers: { 'Accept-Language': 'no' } })
        .then(r => r.json()).then(res => { if (res.length > 0) init(parseFloat(res[0].lat), parseFloat(res[0].lon)) })
        .catch(() => {})
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [lat, lon, adresse, postnummer, poststed, kommune])

  return (
    <div ref={ref} style={{ height: 220, borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border)' }} />
  )
}

// ── Krev profil ───────────────────────────────────────────────────────────────
function KrevProfil({ orgnr, navn }) {
  const [steg, setSteg] = useState('knapp')
  const [svar, setSvar] = useState(null)
  const lagretOrgnr = typeof window !== 'undefined' ? localStorage.getItem('eier_orgnr') : null
  if (lagretOrgnr === orgnr) return null

  const send = async () => {
    setSteg('sender')
    try {
      const apiBase = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
      const res = await fetch(`${apiBase}/krev-profil/${orgnr}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setSvar({ feil: data.detail?.melding || data.detail || 'Noe gikk galt' }); setSteg('feil') }
      else { setSvar(data); setSteg('sendt') }
    } catch { setSvar({ feil: 'Nettverksfeil. Prøv igjen.' }); setSteg('feil') }
  }

  return (
    <div className="claim-bar" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12, marginTop: 4 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 4, color: 'var(--text)' }}>Er dette din klinikk?</div>
        <div style={{ color: 'var(--muted)', fontSize: '.8rem', lineHeight: 1.5 }}>Legg til kontaktinfo, åpningstider og mer.</div>
      </div>
      {steg === 'knapp' && (
        <button className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '.85rem' }} onClick={send}>
          Krev denne profilen →
        </button>
      )}
      {steg === 'sender' && <p style={{ fontSize: '.85rem', color: 'var(--muted)', margin: 0 }}>Sender bekreftelseslenke ...</p>}
      {steg === 'sendt' && svar && (
        <div>
          <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--accent)', fontWeight: 600 }}>Bekreftelseslenke sendt!</p>
          {svar.lenke_dev && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#FFFBEB', borderRadius: 'var(--r-sm)', border: '1px solid #F6E05E' }}>
              <p style={{ margin: '0 0 4px', fontSize: '.73rem', color: '#744210', fontWeight: 700 }}>Utviklingsmodus – lenke:</p>
              <Link to={svar.lenke_dev} style={{ fontSize: '.78rem', color: 'var(--accent)', wordBreak: 'break-all' }}>
                {window.location.origin}{svar.lenke_dev}
              </Link>
            </div>
          )}
        </div>
      )}
      {steg === 'feil' && (
        <div>
          <p style={{ margin: '0 0 6px', fontSize: '.85rem', color: '#c53030' }}>{svar?.feil}</p>
          <button onClick={() => setSteg('knapp')} style={{ fontSize: '.8rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Prøv igjen</button>
        </div>
      )}
    </div>
  )
}

// ── Rediger profil ────────────────────────────────────────────────────────────
function RedigerProfil({ f, onLagret }) {
  const [aapen, setAapen] = useState(false)
  const [lagrer, setLagrer] = useState(false)
  const [melding, setMelding] = useState(null)
  const [telefon, setTelefon]         = useState(f.telefon || f.brreg_mobil || '')
  const [epost, setEpost]             = useState(f.epost || f.brreg_epost || '')
  const [hjemmeside, setHjemmeside]   = useState(f.hjemmeside || f.brreg_hjemmeside || '')
  const [beskrivelse, setBeskrivelse] = useState(f.beskrivelse || f.aktivitet || '')
  const [spesialiteter, setSpesialiteter] = useState(f.spesialiteter || [])
  const [nySpec, setNySpec] = useState('')
  const sesjonToken = localStorage.getItem('sesjon_token')
  const toggleSpec = (s) => setSpesialiteter(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const leggTil = () => { const s = nySpec.trim(); if (s && !spesialiteter.includes(s)) setSpesialiteter(p => [...p, s]); setNySpec('') }
  const lagre = async () => {
    setLagrer(true); setMelding(null)
    try {
      await oppdaterProfil(f.organisasjonsnummer, { telefon: telefon || null, epost: epost || null, hjemmeside: hjemmeside || null, beskrivelse: beskrivelse || null, spesialiteter }, sesjonToken)
      setMelding({ type: 'ok', tekst: 'Profilen er oppdatert!' }); onLagret()
    } catch (e) { setMelding({ type: 'feil', tekst: `Feil: ${e.message}` }) }
    finally { setLagrer(false) }
  }

  return (
    <div style={{ border: `2px solid var(--accent)`, borderRadius: 'var(--r)', overflow: 'hidden' }}>
      <button onClick={() => setAapen(a => !a)} style={{ width: '100%', padding: '14px 18px', background: 'var(--accent-muted)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="edit" size={16} color="var(--accent)" /> Rediger profil
        </span>
        <span style={{ color: 'var(--accent)' }}>{aapen ? '▲' : '▼'}</span>
      </button>
      {aapen && (
        <div style={{ padding: '20px', background: 'var(--surface)' }}>
          <p style={{ margin: '0 0 16px', fontSize: '.83rem', color: 'var(--muted)' }}>BRREG-data er forhåndsutfylt. Du kan overskrive med oppdatert informasjon.</p>
          <div style={{ display: 'grid', gap: 14 }}>
            {[['Telefon', telefon, setTelefon, '+47 000 00 000'], ['E-post', epost, setEpost, 'post@klinikk.no'], ['Hjemmeside', hjemmeside, setHjemmeside, 'https://www.klinikk.no']].map(([label, val, setter, ph]) => (
              <div key={label}>
                <label style={lbl}>{label}</label>
                <input className="inp" value={val} onChange={e => setter(e.target.value)} placeholder={ph} />
              </div>
            ))}
            <div>
              <label style={lbl}>Beskrivelse</label>
              <textarea className="inp" value={beskrivelse} onChange={e => setBeskrivelse(e.target.value)} rows={4} style={{ resize: 'vertical' }} placeholder="Beskriv klinikken ..." />
            </div>
            <div>
              <label style={lbl}>Spesialiteter</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {SPESIALITETER_LISTE.map(s => (
                  <button key={s} onClick={() => toggleSpec(s)} style={{ padding: '4px 11px', borderRadius: 99, border: '1px solid', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600, background: spesialiteter.includes(s) ? 'var(--accent)' : 'var(--surface)', color: spesialiteter.includes(s) ? '#fff' : 'var(--text)', borderColor: spesialiteter.includes(s) ? 'var(--accent)' : 'var(--border)' }}>
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="inp" value={nySpec} onChange={e => setNySpec(e.target.value)} onKeyDown={e => e.key === 'Enter' && leggTil()} placeholder="Annen spesialitet ..." />
                <button className="btn btn-ghost" style={{ whiteSpace: 'nowrap' }} onClick={leggTil}>Legg til</button>
              </div>
            </div>
          </div>
          {melding && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: melding.type === 'ok' ? '#F0FFF4' : '#FFF5F5', color: melding.type === 'ok' ? '#276749' : '#c53030', border: `1px solid ${melding.type === 'ok' ? '#9AE6B4' : '#FEB2B2'}`, fontSize: '.875rem' }}>
              {melding.tekst}
            </div>
          )}
          <button className="btn btn-primary" disabled={lagrer} style={{ marginTop: 16 }} onClick={lagre}>
            {lagrer ? 'Lagrer ...' : 'Lagre profil'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Profilside ────────────────────────────────────────────────────────────────
export default function ProfilSide() {
  const { orgnr } = useParams()
  const navigate = useNavigate()
  const [f, setF] = useState(null)
  const [feil, setFeil] = useState(null)
  const erEier = typeof window !== 'undefined' && localStorage.getItem('eier_orgnr') === orgnr

  const last = () => hentFysioterapeut(orgnr).then(setF).catch(e => setFeil(e.message))
  useEffect(() => { last() }, [orgnr])

  useEffect(() => {
    if (!f) return
    const sted = f.poststed || f.kommune || ''
    document.title = sted ? `${f.navn} – Fysioterapeut i ${sted} | Finn Fysioterapeut` : `${f.navn} | Finn Fysioterapeut`
    const md = document.querySelector('meta[name="description"]')
    const besk = f.beskrivelse || f.aktivitet || `Fysioterapeut i ${[f.adresse, f.postnummer, f.poststed, f.kommune].filter(Boolean).join(', ')}.`
    if (md) md.setAttribute('content', besk)
    const existing = document.getElementById('ld-json-profil')
    if (existing) existing.remove()
    const sc = document.createElement('script')
    sc.id = 'ld-json-profil'; sc.type = 'application/ld+json'
    sc.text = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'MedicalBusiness',
      name: f.navn, medicalSpecialty: 'Physiotherapy',
      address: { '@type': 'PostalAddress', streetAddress: f.adresse, postalCode: f.postnummer, addressLocality: f.poststed || f.kommune, addressRegion: f.fylke, addressCountry: 'NO' },
      ...(f.telefon || f.brreg_mobil ? { telephone: f.telefon || f.brreg_mobil } : {}),
      ...(f.hjemmeside || f.brreg_hjemmeside ? { url: f.hjemmeside || f.brreg_hjemmeside } : {}),
      ...(f.epost || f.brreg_epost ? { email: f.epost || f.brreg_epost } : {}),
    })
    document.head.appendChild(sc)
    return () => { document.title = 'Finn Fysioterapeut i Norge'; document.getElementById('ld-json-profil')?.remove() }
  }, [f])

  if (feil) return (
    <div><Nav />
      <div className="wrap" style={{ padding: '4rem 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', marginBottom: 16 }}>Klarte ikke laste klinikk: {feil}</p>
        <Link to="/" className="btn btn-primary">← Tilbake til søk</Link>
      </div>
    </div>
  )

  if (!f) return (
    <div><Nav />
      <div className="wrap" style={{ padding: '4rem 24px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--muted)' }}>Laster ...</p>
      </div>
    </div>
  )

  const telefon    = f.telefon || f.brreg_mobil
  const epost      = f.epost || f.brreg_epost
  const hjemmeside = f.hjemmeside || f.brreg_hjemmeside
  const harAdresse = f.adresse || f.postnummer || f.poststed || f.kommune

  return (
    <div>
      <Nav />

      {/* ── Mørk hero-header ── */}
      <div style={{ background: 'var(--nav-bg)', padding: '32px 0 40px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="wrap">
          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Hjem</span>
            {f.fylke && <><span className="breadcrumb-sep">›</span><span style={{ cursor: 'pointer' }} onClick={() => navigate(`/sok?fylke=${encodeURIComponent(f.fylke)}`)}>{f.fylke}</span></>}
            {f.poststed && f.poststed !== f.fylke && <><span className="breadcrumb-sep">›</span><span style={{ cursor: 'pointer' }} onClick={() => navigate(`/sok?q=${encodeURIComponent(f.poststed)}`)}>{f.poststed}</span></>}
            <span className="breadcrumb-sep">›</span>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{f.navn}</span>
          </nav>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div>
              {/* Meta-badges */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {[
                  f.organisasjonsform_beskrivelse || f.organisasjonsform_kode,
                  f.antall_ansatte != null ? `${f.antall_ansatte} ansatte` : null,
                  f.stiftelsesdato ? `Stiftet ${f.stiftelsesdato.split('-')[0]}` : null,
                ].filter(Boolean).map(b => (
                  <span key={b} style={{ fontSize: '.75rem', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: 4, padding: '2px 8px' }}>{b}</span>
                ))}
              </div>
              <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-.02em' }}>
                {f.navn}
              </h1>
              <p style={{ margin: '0 0 14px', fontSize: '.95rem', color: 'rgba(255,255,255,0.5)' }}>
                Fysioterapiklinikk · {f.poststed}{f.fylke && f.fylke !== f.poststed ? `, ${f.fylke}` : ''}
              </p>
              {f.spesialiteter?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {f.spesialiteter.map(s => <Tag key={s} label={s} size="lg" />)}
                </div>
              )}
            </div>

            {/* Kontaktkort (desktop) */}
            {(telefon || epost || hjemmeside) && (
              <div className="hide-mobile" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--r)', padding: '18px 22px', minWidth: 220 }}>
                {[
                  telefon && { icon: 'phone', label: 'Telefon', val: telefon, href: `tel:${telefon}` },
                  epost && { icon: 'email', label: 'E-post', val: epost, href: `mailto:${epost}` },
                  hjemmeside && { icon: 'globe', label: 'Nettside', val: hjemmeside.replace(/^https?:\/\//, ''), href: hjemmeside.startsWith('http') ? hjemmeside : `https://${hjemmeside}`, ext: true },
                ].filter(Boolean).map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Icon name={row.icon} size={16} color="rgba(255,255,255,0.5)" />
                    <div>
                      <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{row.label}</div>
                      <a href={row.href} target={row.ext ? '_blank' : undefined} rel="noreferrer" style={{ fontWeight: 500, color: 'var(--accent)', fontSize: '.88rem', textDecoration: 'none' }}>{row.val}</a>
                    </div>
                  </div>
                ))}
                <a href={telefon ? `tel:${telefon}` : `mailto:${epost}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '.88rem', marginTop: 4 }}>
                  Ta kontakt →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Hovedinnhold ── */}
      <div className="wrap" style={{ padding: '36px 24px 0' }}>
        <div className="profile-grid">

          {/* Venstre kolonne */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Om klinikken */}
            {(f.beskrivelse || f.aktivitet) && (
              <section>
                <SectionHead>Om klinikken</SectionHead>
                <div className="card">
                  <p style={{ margin: 0, lineHeight: 1.75, fontSize: '.93rem', color: 'var(--text)' }}>
                    {f.beskrivelse || f.aktivitet}
                  </p>
                </div>
              </section>
            )}

            {/* Kontakt og beliggenhet */}
            <section>
              <SectionHead>Kontakt og beliggenhet</SectionHead>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Kontaktrader (mobil + desktop) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {[
                    harAdresse && { icon: 'pin', label: 'Adresse', val: [f.adresse, f.postnummer && f.poststed ? `${f.postnummer} ${f.poststed}` : f.poststed].filter(Boolean).join(', ') },
                    telefon && { icon: 'phone', label: 'Telefon', val: telefon, href: `tel:${telefon}` },
                    epost && { icon: 'email', label: 'E-post', val: epost, href: `mailto:${epost}` },
                    hjemmeside && { icon: 'globe', label: 'Nettside', val: hjemmeside.replace(/^https?:\/\//, ''), href: hjemmeside.startsWith('http') ? hjemmeside : `https://${hjemmeside}`, ext: true },
                  ].filter(Boolean).map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <Icon name={row.icon} size={15} color="var(--accent)" style={{ marginTop: 3 }} />
                      <div>
                        <div style={{ fontSize: '.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>{row.label}</div>
                        {row.href
                          ? <a href={row.href} target={row.ext ? '_blank' : undefined} rel="noreferrer" style={{ fontSize: '.88rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>{row.val}</a>
                          : <div style={{ fontSize: '.88rem', marginTop: 1, color: 'var(--text)' }}>{row.val}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Kart */}
                {harAdresse && (
                  <ProfilKart adresse={f.adresse} postnummer={f.postnummer} poststed={f.poststed} kommune={f.kommune} lat={f.lat} lon={f.lon} />
                )}
              </div>
            </section>

            {/* Spesialiteter */}
            {f.spesialiteter?.length > 0 && (
              <section>
                <SectionHead>Spesialiteter</SectionHead>
                <div className="card">
                  <p style={{ margin: '0 0 14px', fontSize: '.85rem', color: 'var(--muted)', lineHeight: 1.6 }}>Klikk på en spesialitet for å finne andre klinikker som tilbyr det samme.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {f.spesialiteter.map(s => (
                      <Tag key={s} label={s} size="lg" clickable onClick={() => navigate(`/sok?spesialitet=${encodeURIComponent(s)}`)} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* FAQ */}
            <section>
              <SectionHead>Ofte stilte spørsmål</SectionHead>
              <div className="card"><FaqAccordion /></div>
            </section>

            {/* Eier-seksjon */}
            {erEier
              ? <RedigerProfil f={f} onLagret={last} />
              : <KrevProfil orgnr={orgnr} navn={f.navn} />
            }
          </div>

          {/* Høyre sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Virksomhetsdata */}
            <div className="card">
              <p className="sec-label" style={{ marginBottom: 12 }}>Virksomhetsdata</p>
              <QuickFacts f={f} />
              <p style={{ margin: '12px 0 0', fontSize: '.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Kilde:{' '}
                <a href="https://www.brreg.no" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Brønnøysundregistrene</a>
                <br />Sist oppdatert: {f.sist_oppdatert_i_db?.split('T')[0] || '–'}
              </p>
            </div>

            {/* SEO-preview (alltid synlig) */}
            <div className="card">
              <p className="sec-label" style={{ marginBottom: 12 }}>Slik ser siden ut i Google</p>
              <div className="serp-card" style={{ padding: '14px 16px' }}>
                <div className="serp-url">finn-fysioterapeut.no › {f.fylke?.toLowerCase().replace(/ /g, '-')}/{f.poststed?.toLowerCase()}</div>
                <div className="serp-title">{f.navn} – Fysioterapi i {f.poststed}</div>
                <div className="serp-desc">{f.spesialiteter?.join(', ')}{f.spesialiteter?.length ? '. ' : ''}{f.adresse}, {f.postnummer} {f.poststed}.</div>
              </div>
            </div>

            {/* Nærliggende klinikker-lenke */}
            {f.poststed && (
              <div className="card">
                <p className="sec-label" style={{ marginBottom: 12 }}>I samme område</p>
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '.82rem' }}
                  onClick={() => navigate(`/sok?q=${encodeURIComponent(f.poststed)}`)}
                >
                  Se alle i {f.poststed} →
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Kilde-footer */}
        <div style={{ margin: '40px 0 0', padding: '12px 16px', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: '.78rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span>Kilde: Brønnøysundregistrene (BRREG) · Lisens: NLOD · Åpne data</span>
          <span>Org.nr {f.organisasjonsnummer}</span>
        </div>
      </div>

      <Footer />
    </div>
  )
}

const lbl = { display: 'block', marginBottom: 4, fontSize: '.83rem', fontWeight: 600, color: 'var(--text)' }
