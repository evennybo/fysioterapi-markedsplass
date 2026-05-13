// src/components/shared.jsx – Delte UI-komponenter

import { Link } from 'react-router-dom'

// ── SVG-ikoner (ingen emojier) ────────────────────────────────────────────────
const PATHS = {
  pin:       'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  phone:     'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  email:     'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  globe:     'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  search:    'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  employees: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  chevron:   'M9 18l6-6-6-6',
  check:     'M20 6L9 17l-5-5',
  edit:      'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  arrow_r:   'M10 17l5-5-5-5v10z',
  location:  'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06z',
}

export function Icon({ name, size = 16, color = 'currentColor', style: s }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}
      style={{ display: 'block', flexShrink: 0, ...s }}>
      <path d={PATHS[name]} />
    </svg>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────
export function Nav() {
  return (
    <nav className="nav">
      <div className="wrap">
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            <span className="nav-logo-icon">F</span>
            <span>Finn Fysioterapeut</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link to="/sok" className="nav-link hide-mobile">Søk klinikker</Link>
            <Link to="/sok" className="btn btn-primary" style={{ padding: '7px 16px', fontSize: '.82rem' }}>
              Er du klinikk? →
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer style={{ marginTop: 64, borderTop: '1px solid var(--border)', padding: '24px 0' }}>
      <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: '.8rem', color: 'var(--muted)' }}>
        <span>
          Kilde:{' '}
          <a href="https://www.brreg.no" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
            Brønnøysundregistrene
          </a>{' '}· Lisens: NLOD
        </span>
        <span>Finn Fysioterapeut · Åpne data for alle</span>
      </div>
    </footer>
  )
}

// ── Tag ───────────────────────────────────────────────────────────────────────
export function Tag({ label, size = 'sm', clickable, onClick }) {
  return (
    <span
      className={`tag${size === 'lg' ? ' tag-lg' : ''}${clickable ? ' tag-link' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      {label}
    </span>
  )
}

// ── SectionHead ───────────────────────────────────────────────────────────────
export function SectionHead({ children }) {
  return (
    <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px', color: 'var(--text)' }}>
      {children}
    </h2>
  )
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
const DEFAULT_FAQ = [
  { q: 'Trenger jeg henvisning fra lege?', a: 'Nei, du kan bestille time direkte uten henvisning. Har du likevel en legereferanse, ta den gjerne med til første konsultasjon.' },
  { q: 'Hva koster en time fysioterapi?', a: 'Priser varierer mellom klinikker, typisk 500–800 kr per time. Har du yrkesskade, grønt kort, eller fri behandling kan det bli rimeligere eller gratis.' },
  { q: 'Hva er forskjellen på fysioterapi og kiropraktikk?', a: 'Fysioterapeuter fokuserer på bevegelse, styrke og rehabilitering. Kiropraktorer spesialiserer seg på ryggsøyle og nervesystemet. Mange klinikker tilbyr begge deler.' },
  { q: 'Tar dere imot barn?', a: 'Mange klinikker har egne barnefysioterapeuter. Bruk filteret for å finne dem nær deg.' },
  { q: 'Er det mulig med hjemmebesøk?', a: 'Noen klinikker tilbyr hjemmebehandling. Filtrer på spesialiteten Hjemmebesøk for å finne disse klinikkene i ditt område.' },
  { q: 'Hva skjer på første konsultasjon?', a: 'Terapeuten starter med en grundig kartlegging av plager og sykehistorikk, deretter en funksjonell undersøkelse. Dere lager i fellesskap en behandlingsplan.' },
]

export function FaqAccordion({ items = DEFAULT_FAQ }) {
  const [open, setOpen] = useState(null)
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="faq-item">
          <div className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
            <span>{item.q}</span>
            <span style={{ color: 'var(--accent)', fontSize: '1.3rem', lineHeight: 1, transition: 'transform .2s', transform: open === i ? 'rotate(45deg)' : 'none', flexShrink: 0 }}>+</span>
          </div>
          {open === i && <div className="faq-a">{item.a}</div>}
        </div>
      ))}
    </div>
  )
}

// ── QuickFacts sidebar ────────────────────────────────────────────────────────
export function QuickFacts({ f }) {
  const rows = [
    ['Virksomhetstype', f.organisasjonsform_beskrivelse || f.organisasjonsform_kode],
    ['Org.nr', f.organisasjonsnummer?.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')],
    ['Stiftet', f.stiftelsesdato?.split('-')[0]],
    ['Ansatte', f.antall_ansatte != null ? String(f.antall_ansatte) : null],
    ['Næringskode', f.naeringskode1 ? `${f.naeringskode1} – ${f.naeringskode1_beskrivelse}` : null],
  ].filter(([, v]) => v)
  return (
    <div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }}>
          <span style={{ color: 'var(--muted)' }}>{k}</span>
          <span style={{ fontWeight: 500, textAlign: 'right', color: 'var(--text)' }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

// Need useState import
import { useState } from 'react'
