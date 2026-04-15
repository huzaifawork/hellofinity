import { useNavigate } from 'react-router-dom'
import '../styles/landing.css'

export default function SubscribedPage() {
  const navigate = useNavigate()
  return (
    <div style={{
      fontFamily: 'var(--font-sans)', background: 'var(--bg)', color: 'var(--dark)',
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center'
    }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '-0.02em', marginBottom: 32 }}>
          <span style={{ color: 'var(--sun)' }}>Hello</span>
          <span style={{ fontStyle: 'italic', color: 'var(--dark)' }}>Finity</span>
        </div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, marginBottom: 12, letterSpacing: '-0.02em' }}>
          You're on the list.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32 }}>
          Thanks for signing up. We'll send you a heads-up as soon as HelloFinity launches and the Day One passes go live. Keep an eye on your inbox.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-block', background: 'var(--dark)', color: 'var(--bg)',
            padding: '14px 32px', borderRadius: 40, fontFamily: 'var(--font-sans)',
            fontSize: 14, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', border: 'none'
          }}
        >
          Back to hellofinity.com
        </button>
        <div style={{ marginTop: 40, fontSize: 12, color: 'var(--hint)' }}>No spam, ever. Just launch updates.</div>
      </div>
    </div>
  )
}
