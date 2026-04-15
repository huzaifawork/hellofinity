import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

// Load Stripe once — outside component to avoid re-instantiation
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// ─── Stripe appearance matching HelloFinity design ────────────────────────────
const STRIPE_APPEARANCE = {
  theme: 'flat',
  variables: {
    fontFamily: '"DM Sans", system-ui, sans-serif',
    fontSizeBase: '14px',
    colorPrimary: '#F5C842',
    colorBackground: '#FAFAF8',
    colorText: '#22100C',
    colorTextSecondary: '#8A6A60',
    colorDanger: '#e04c2f',
    borderRadius: '10px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: '1px solid rgba(34,16,12,0.15)',
      boxShadow: 'none',
      padding: '11px 14px',
      backgroundColor: '#F5F2ED',
      color: '#22100C',
      fontSize: '14px',
    },
    '.Input:focus': {
      border: '1.5px solid #F5C842',
      boxShadow: '0 0 0 3px rgba(245,200,66,0.15)',
      outline: 'none',
    },
    '.Input--invalid': {
      border: '1.5px solid #e04c2f',
    },
    '.Label': {
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      color: '#8A6A60',
      marginBottom: '6px',
    },
    '.Error': {
      fontSize: '12px',
      color: '#e04c2f',
    },
    '.Tab': {
      border: '1px solid rgba(34,16,12,0.15)',
      backgroundColor: '#F5F2ED',
    },
    '.Tab--selected': {
      border: '1.5px solid #F5C842',
      backgroundColor: '#FFFBEC',
    },
  },
}

// ─── Inner form (needs to be inside <Elements>) ───────────────────────────────

function PaymentForm({ email, onSuccess, onClose }) {
  const stripe   = useStripe()
  const elements = useElements()

  const [paying,  setPaying]  = useState(false)
  const [errMsg,  setErrMsg]  = useState('')

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setErrMsg('')
    setPaying(true)

    // Trigger form validation + wallet collection
    const { error: submitErr } = await elements.submit()
    if (submitErr) { setErrMsg(submitErr.message); setPaying(false); return }

    // Confirm the PaymentIntent
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/app`,
        receipt_email: email,
      },
      redirect: 'if_required',   // only redirect for 3DS / redirect-based methods
    })

    if (error) {
      setErrMsg(
        error.type === 'card_error' || error.type === 'validation_error'
          ? error.message
          : 'Something went wrong. Please try again.'
      )
      setPaying(false)
    } else {
      // Payment succeeded — no redirect needed (card completed inline)
      onSuccess()
    }
  }

  return (
    <form onSubmit={handlePay} className="co-form">
      <PaymentElement
        options={{ layout: 'tabs' }}
      />

      {errMsg && (
        <div className="co-error">
          <span>⚠</span> {errMsg}
        </div>
      )}

      <button
        type="submit"
        className="co-pay-btn"
        disabled={!stripe || paying}
      >
        {paying
          ? <span className="co-paying"><span className="co-spinner" />Processing…</span>
          : 'Pay £12.99 →'}
      </button>

      <div className="co-secure-note">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Secured by Stripe · 256-bit SSL encryption
      </div>
    </form>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function CheckoutModal({ onClose }) {
  // Step: 'email' → 'payment' → 'success'
  const [step,         setStep]         = useState('email')
  const [email,        setEmail]        = useState('')
  const [emailErr,     setEmailErr]     = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [apiError,     setApiError]     = useState('')

  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── Step 1: validate email → create PaymentIntent ──────────────────────────

  async function handleEmailSubmit(e) {
    e.preventDefault()
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!email.trim()) { setEmailErr('Email is required.'); return }
    if (!EMAIL_RE.test(email.trim())) { setEmailErr('Please enter a valid email address.'); return }
    setEmailErr('')
    setApiError('')
    setLoading(true)

    try {
      const res  = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok || !data.clientSecret) throw new Error(data.error || 'Failed to initialise payment.')
      setClientSecret(data.clientSecret)
      setStep('payment')
    } catch (err) {
      setApiError(err.message || 'Could not start payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="co-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="co-modal">

        {/* ── Header ── */}
        <div className="co-header">
          <div className="co-header-left">
            <div className="co-brand">Hello<span>Finity</span></div>
            {step !== 'success' && (
              <div className="co-product">
                Day One Pass <span className="co-badge">First 200 only</span>
              </div>
            )}
          </div>
          <button className="co-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Step: email ── */}
        {step === 'email' && (
          <div className="co-body">
            <div className="co-price-block">
              <div className="co-price">£12.99</div>
              <div className="co-price-sub">one-time · lifetime access</div>
              <div className="co-price-saving">Pro is £14.99/year — Day One members never pay again</div>
            </div>

            <div className="co-features">
              {[
                'Unlimited challenges',
                'All challenge types (52 Week + 365 Days)',
                'Shareable progress cards',
                'Cloud sync across all devices',
                'Every future feature, forever',
                'Direct feedback channel',
              ].map(f => (
                <div key={f} className="co-feature-item">
                  <span className="co-check">✓</span> {f}
                </div>
              ))}
            </div>

            <div className="co-divider" />

            <form onSubmit={handleEmailSubmit}>
              <label className="co-label">Your email address</label>
              <input
                className={`co-input${emailErr ? ' co-input-error' : ''}`}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailErr('') }}
              />
              {emailErr && <div className="co-field-error">⚠ {emailErr}</div>}
              {apiError && <div className="co-field-error">⚠ {apiError}</div>}

              <button type="submit" className="co-continue-btn" disabled={loading}>
                {loading ? <><span className="co-spinner" /> Starting…</> : 'Continue to payment →'}
              </button>
            </form>

            <div className="co-guarantee">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              30-day money-back guarantee · No questions asked
            </div>
          </div>
        )}

        {/* ── Step: payment ── */}
        {step === 'payment' && clientSecret && (
          <div className="co-body">
            <div className="co-order-summary">
              <div className="co-order-line">
                <span>HelloFinity Day One Pass</span>
                <span className="co-order-price">£12.99</span>
              </div>
              <div className="co-order-email">{email}</div>
            </div>

            <div className="co-divider" />

            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: STRIPE_APPEARANCE,
              }}
            >
              <PaymentForm
                email={email}
                onSuccess={() => setStep('success')}
                onClose={onClose}
              />
            </Elements>

            <button className="co-back-btn" onClick={() => setStep('email')}>
              ← Change email
            </button>
          </div>
        )}

        {/* ── Step: success ── */}
        {step === 'success' && (
          <div className="co-body co-success-body">
            <div className="co-success-icon">🎉</div>
            <div className="co-success-title">You're in!</div>
            <div className="co-success-sub">
              Welcome to the Day One founding members. A receipt is on its way to <strong>{email}</strong>.
            </div>
            <div className="co-success-perks">
              <div className="co-perk">✓ Lifetime access locked in</div>
              <div className="co-perk">✓ You'll be first when we launch</div>
              <div className="co-perk">✓ Direct line to the product team</div>
            </div>
            <button className="co-continue-btn" onClick={onClose}>
              Done →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
