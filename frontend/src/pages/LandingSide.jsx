// src/pages/LandingSide.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { hentFylker, hentStatistikk, sokFysioterapeuter } from '../lib/api.js'
import { Nav, Footer, Tag, Icon } from '../components/shared.jsx'

const POPULAERE_STEDER = [
  'Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø',
  'Kristiansand', 'Drammen', 'Sandnes', 'Fredrikstad', 'Bodø', 'Ålesund', 'Tønsberg',
]

const SPESIALITETER = [
  'Idrettsskader', 'Rygg og nakke', 'Barn og unge', 'Eldre og geriatri',
  'Nevrologisk', 'Bekkenbunnsykdom', 'Post-operativ', 'Hjemmebesøk',
  'Arbeidsrelaterte skader', 'Hodepine og svimmelhet', 'Svangerskap',
]

export default function LandingSide() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [fylke, setFylke] = useState('')
  const [fylker, setFylker] = useState([])
  const [statistikk, setStatistikk] = useState(null)
  const [topp5, setTopp5] = useState([])

  useEffect(() => {
    hentStatistikk().then(setStatistikk).catch(() => {})
    hentFylker().then(setFylker).catch(() => {})
    // Hent de 5 første aktive klinikkene med flest ansatte som topp 5
    sokFysioterapeuter({ size: 5, page: 0 })
      .then(d => setTopp5(d.resultater || []))
      .catch(() => {})
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (fylke) params.set('fylke', fylke)
    navigate(`/sok?${params.toString()}`)
  }

  const sokPaaSted = (sted) => navigate(`/sok?q=${encodeURIComponent(sted)}`)
  const sokPaaSpec = (s) => navigate(`/sok?spesialitet=${encodeURIComponent(s)}`)

  return (
    <div>
      <Nav />

      {/* ── Hero ── */}
      <section style={{ background: 'var(--nav-bg)', padding: '72px 0 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 65% 80% at 70% -10%, rgba(15,122,73,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        <div className="wrap" style={{ position: 'relative' }}>
          <div style={{ maxWidth: 620 }}>
            {statistikk && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(15,122,73,0.15)', border: '1px solid rgba(15,122,73,0.3)', borderRadius: 999, padding: '4px 12px', marginBottom: 20 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: '.78rem', color: '#5FD49A', fontWeight: 600 }}>
                  {statistikk.aktive.toLocaleString('no')} klinikker registrert
                </span>
              </div>
            )}
            <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(2.4rem, 5.5vw, 3.8rem)', fontWeight: 800, lineHeight: 1.12, color: '#fff', margin: '0 0 16px', letterSpacing: '-.02em' }}>
              Finn rett<br />
              <span style={{ color: 'var(--accent)' }}>fysioterapeut</span><br />
              nær deg
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.55)', maxWidth: 440, margin: '0 0 36px', lineHeight: 1.65 }}>
              Gratis oversikt over{statistikk ? ` ${statistikk.aktive.toLocaleString('no')}` : ''} norske fysioterapiklinikker
              {statistikk ? ` i ${statistikk.kommuner_representert} kommuner` : ''}. Basert på åpne data fra BRREG.
            </p>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 560 }}>
              <input
                className="inp"
                style={{ flex: '2 1 200px', backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)', color: '#fff' }}
                placeholder="Klinikknavn eller sted..."
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              <select
                className="inp"
                style={{ flex: '1 1 140px', backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)', color: fylke ? '#fff' : 'rgba(255,255,255,0.45)', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")" }}
                value={fylke}
                onChange={e => setFylke(e.target.value)}
              >
                <option value="">Alle fylker</option>
                {fylker.map(f => <option key={f.fylke} value={f.fylke}>{f.fylke}</option>)}
              </select>
              <button type="submit" className="btn btn-primary" style={{ flex: '0 0 auto', padding: '10px 24px', fontSize: '.95rem' }}>
                Søk
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      {statistikk && (
        <div style={{ background: 'var(--elevated)', borderBottom: '1px solid var(--border)' }}>
          <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
            {[
              { n: statistikk.aktive.toLocaleString('no'), l: 'aktive klinikker' },
              { n: statistikk.kommuner_representert, l: 'kommuner' },
              { n: 15, l: 'fylker' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '18px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)' }}>{s.n}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text)', opacity: .65, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ukas topp 5 ── */}
      {topp5.length > 0 && (
        <section style={{ padding: '52px 0 48px' }}>
          <div className="wrap">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
              <div>
                <p className="sec-label" style={{ marginBottom: 6 }}>Ukas topp 5</p>
                <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 700, letterSpacing: '-.01em', color: 'var(--text)' }}>
                  Fremhevede klinikker
                </h2>
              </div>
              <span style={{ fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                Oppdatert {new Date().toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topp5.map((f, i) => (
                <div
                  key={f.organisasjonsnummer}
                  onClick={() => navigate(`/fysioterapeut/${f.organisasjonsnummer}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: i === 0 ? 'var(--accent)' : 'var(--border)', minWidth: 44, textAlign: 'center', lineHeight: 1, letterSpacing: '-.03em' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{f.navn}</span>
                      <span style={{ fontSize: '.72rem', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 7px', color: 'var(--muted)', flexShrink: 0 }}>
                        {f.organisasjonsform_kode}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '.83rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="pin" size={13} color="var(--muted)" />
                        {[f.poststed, f.fylke].filter(Boolean).join(', ')}
                      </span>
                      {f.spesialiteter?.slice(0, 2).map(s => <Tag key={s} label={s} />)}
                    </div>
                  </div>
                  <span style={{ fontSize: '.8rem', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }} className="hide-mobile">
                    Se profil →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Populære steder ── */}
      <section style={{ padding: '0 0 56px' }}>
        <div className="wrap">
          <p className="sec-label" style={{ marginBottom: 8 }}>Populære steder</p>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 700, margin: '0 0 28px', letterSpacing: '-.01em', color: 'var(--text)' }}>
            Finn klinikker i din by
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {POPULAERE_STEDER.map(s => (
              <div key={s} className="city-chip" onClick={() => sokPaaSted(s)}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Spesialiteter ── */}
      <section style={{ padding: '0 0 56px' }}>
        <div className="wrap">
          <p className="sec-label" style={{ marginBottom: 8 }}>Spesialiteter</p>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 700, margin: '0 0 20px', letterSpacing: '-.01em', color: 'var(--text)' }}>
            Søk på behandlingstype
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SPESIALITETER.map(s => (
              <Tag key={s} label={s} size="lg" clickable onClick={() => sokPaaSpec(s)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Slik fungerer det ── */}
      <section style={{ padding: '48px 0 56px', background: 'var(--elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="wrap">
          <p className="sec-label" style={{ marginBottom: 8 }}>Slik fungerer det</p>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 700, margin: '0 0 36px', letterSpacing: '-.01em', color: 'var(--text)' }}>
            Enkelt å bruke – gratis alltid
          </h2>
          <div className="how-grid">
            {[
              { n: '1', t: 'Søk', d: 'Skriv inn by, fylke, klinikknavn eller behandlingstype du trenger hjelp med.' },
              { n: '2', t: 'Sammenlign', d: 'Se adresse, kontaktinfo, spesialiteter og antall ansatte for alle klinikker.' },
              { n: '3', t: 'Ta kontakt', d: 'Ring, send e-post eller besøk hjemmesiden direkte fra klinikkprofilen.' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div className="step-num">{step.n}</div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: '1rem', margin: '0 0 6px', color: 'var(--text)' }}>{step.t}</h3>
                  <p style={{ fontSize: '.88rem', color: 'var(--text)', opacity: .7, lineHeight: 1.65, margin: 0 }}>{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Er du klinikkeier? ── */}
      <section style={{ padding: '56px 0' }}>
        <div className="wrap">
          <div style={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>Er du klinikkeier?</h2>
              <p style={{ fontSize: '.9rem', color: 'var(--muted)', margin: 0, maxWidth: 440 }}>
                Grunndata hentes automatisk fra BRREG. Berik profilen din med kontaktinfo, åpningstider og spesialiteter — gratis.
              </p>
            </div>
            <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '.95rem' }} onClick={() => navigate('/sok')}>
              Krev din profil →
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
