// src/pages/VerifiserSide.jsx
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Nav, Footer } from '../components/shared.jsx'

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export default function VerifiserSide() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [steg, setSteg] = useState('verifiserer')

  useEffect(() => {
    fetch(`${API_BASE}/verifiser/${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) { setSteg('feil'); return }
        localStorage.setItem('sesjon_token', data.sesjon_token)
        localStorage.setItem('eier_orgnr', data.orgnr)
        localStorage.setItem('eier_navn', data.navn)
        localStorage.setItem('eier_epost', data.epost)
        setSteg('ok')
        setTimeout(() => navigate(`/fysioterapeut/${data.orgnr}`), 2500)
      })
      .catch(() => setSteg('feil'))
  }, [token])

  return (
    <div>
      <Nav />
      <div style={{ maxWidth: 480, margin: '8rem auto', padding: '0 24px', textAlign: 'center' }}>
        {steg === 'verifiserer' && (
          <>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin .8s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ color: 'var(--muted)' }}>Verifiserer lenke ...</p>
          </>
        )}
        {steg === 'ok' && (
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--text)', margin: '0 0 8px' }}>Du er nå verifisert!</h2>
            <p style={{ color: 'var(--muted)', margin: '0 0 6px' }}>
              Innlogget som <b>{localStorage.getItem('eier_epost')}</b>
            </p>
            <p style={{ fontSize: '.85rem', color: 'var(--muted)', opacity: .7 }}>Sender deg til profilen ...</p>
          </div>
        )}
        {steg === 'feil' && (
          <div className="card" style={{ padding: '2rem', borderColor: '#FEB2B2' }}>
            <h2 style={{ fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: '1.3rem', color: '#c53030', margin: '0 0 8px' }}>Ugyldig lenke</h2>
            <p style={{ color: 'var(--muted)', margin: '0 0 20px' }}>Lenken er enten brukt opp eller utløpt (gyldig i 24 timer).</p>
            <Link to="/" className="btn btn-primary">← Tilbake til forsiden</Link>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
