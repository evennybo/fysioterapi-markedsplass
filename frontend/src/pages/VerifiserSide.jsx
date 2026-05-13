// src/pages/VerifiserSide.jsx
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'

export default function VerifiserSide() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [steg, setSteg] = useState('verifiserer') // verifiserer | ok | feil

  useEffect(() => {
    fetch(`/api/verifiser/${token}`)
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
    <div style={{ maxWidth: 480, margin: '8rem auto', padding: '2rem', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      {steg === 'verifiserer' && (
        <>
          <div style={spinner} />
          <p style={{ color: '#718096', marginTop: 20 }}>Verifiserer lenke ...</p>
        </>
      )}

      {steg === 'ok' && (
        <div style={{ padding: '2rem', borderRadius: 16, background: '#f0fff4', border: '1px solid #9ae6b4' }}>
          <div style={{ fontSize: '3rem' }}>✓</div>
          <h2 style={{ color: '#276749', margin: '12px 0 8px' }}>Du er nå verifisert!</h2>
          <p style={{ color: '#276749', margin: 0 }}>
            Innlogget som <b>{localStorage.getItem('eier_epost')}</b>
          </p>
          <p style={{ color: '#718096', fontSize: '0.875rem', marginTop: 8 }}>Sender deg til profilen ...</p>
        </div>
      )}

      {steg === 'feil' && (
        <div style={{ padding: '2rem', borderRadius: 16, background: '#fff5f5', border: '1px solid #feb2b2' }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ color: '#c53030', margin: '12px 0 8px' }}>Ugyldig lenke</h2>
          <p style={{ color: '#718096', margin: 0 }}>Lenken er enten brukt opp eller utløpt (gyldig i 24 timer).</p>
          <Link to="/" style={{ display: 'inline-block', marginTop: 20, color: '#3182ce' }}>← Tilbake til forsiden</Link>
        </div>
      )}
    </div>
  )
}

const spinner = {
  width: 48, height: 48, borderRadius: '50%',
  border: '4px solid #e2e8f0', borderTopColor: '#3182ce',
  animation: 'spin 0.8s linear infinite', margin: '0 auto',
}
