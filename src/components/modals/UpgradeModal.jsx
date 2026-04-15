import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useApp } from '../../context/AppContext'
import { sb } from '../../services/supabase'
import '../../styles/upgrade.css'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

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
    '.Label': {
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      color: '#8A6A60',
      marginBottom: '6px',
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

// ─── Inner payment form ────────────────────────────────────────────────────────

function UpgradePaymentForm({ email, onSuccess }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [paying, setPaying]   = useState(false)
  const [errMsg, setErrMsg]   = useState('')

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setErrMsg('')
    setPaying(true)

    const { error: submitErr } = await elements.submit()
    if (submitErr) { setErrMsg(submitErr.message); setPaying(false); return }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/app/dashboard`,
        receipt_email: email,
      },
      redirect: 'if_required',
    })

    if (error) {
      setErrMsg(
        error.type === 'card_error' || error.type === 'validation_error'
          ? error.message
          : 'Something went wrong. Please try again.'
      )
      setPaying(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handlePay} className="upgrade-form">
      <PaymentElement options={{ layout: 'tabs' }} />
      {errMsg && <div className="upgrade-error"><span>⚠</span> {errMsg}</div>}
      <button type="submit" className="upgrade-pay-btn" disabled={!stripe || paying}>
        {paying
          ? <span className="upgrade-paying"><span className="upgrade-spinner" />Processing…</span>
          : 'Pay £12.99 — Unlock Pro →'}
      </button>
      <div className="upgrade-secure">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Secured by Stripe · 256-bit SSL
      </div>
    </form>
  )
}

// ─── Main modal ────────────────────────────────────────────────────────────────

const PRO_FEATURES = [
  { icon: '✨', text: 'Custom challenge creator' },
  { icon: '📊', text: 'All challenge types (52 Weeks + 365 Days)' },
  { icon: '🔄', text: 'Unlimited active challenges' },
  { icon: '🃏', text: 'Shareable progress cards' },
  { icon: '☁️', text: 'Cloud sync across all devices' },
  { icon: '🚀', text: 'Every future feature, forever' },
]

export default function UpgradeModal({ onClose, onUpgraded }) {
  const { state, dispatch } = useApp()
  const { currentUser } = state

  // Steps: 'info' → 'payment' → 'success'
  const [step, setStep]               = useState('info')
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading]         = useState(false)
  const [apiError, setApiError]       = useState('')

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleUpgradeClick() {
    setApiError('')
    setLoading(true)
    try {
      const email = currentUser?.email || ''
      const res  = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || !data.clientSecret) throw new Error(data.error || 'Failed to start payment.')
      setClientSecret(data.clientSecret)
      setStep('payment')
    } catch (err) {
      setApiError(err.message || 'Could not start payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePaymentSuccess() {
    // Record the payment. Our new Supabase Postgres trigger handles the rest 
    // automatically (dates, expirations, matching profile, flag, etc)!
    if (currentUser?.id) {
      await sb.from('payments').insert({
        user_id: currentUser.id,
        email: currentUser.email,
        amount_paid: 12.99,
        currency: 'GBP',
        plan_name: 'Day One Pass'
      })
    }
    dispatch({ type: 'SET_IS_PREMIUM', payload: true })
    setStep('success')
  }

  return (
    <div className="upgrade-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="upgrade-modal">

        {/* Close button */}
        <button className="upgrade-close" onClick={onClose} aria-label="Close">✕</button>

        {/* ── Step: info ── */}
        {step === 'info' && (
          <>
            {/* Hero section */}
            <div className="upgrade-hero">
              <div className="upgrade-hero-glow" />
              <div className="upgrade-hero-icon">⚡</div>
              <h2 className="upgrade-hero-title">Unlock Pro</h2>
              <p className="upgrade-hero-sub">
                Custom challenges and more — one payment, lifetime access
              </p>
            </div>

            {/* Price card */}
            <div className="upgrade-price-card">
              <div className="upgrade-price-row">
                <div>
                  <div className="upgrade-plan-name">Day One Pass</div>
                  <div className="upgrade-plan-sub">Lifetime access · No subscription</div>
                </div>
                <div className="upgrade-price">
                  <span className="upgrade-price-amount">£12.99</span>
                  <span className="upgrade-price-period">one-time</span>
                </div>
              </div>
              <div className="upgrade-price-saving">
                <span className="upgrade-saving-badge">SAVE</span>
                Pro would be £14.99/year — Day One members never pay again
              </div>
            </div>

            {/* Features */}
            <div className="upgrade-features">
              {PRO_FEATURES.map(f => (
                <div key={f.text} className="upgrade-feature">
                  <span className="upgrade-feature-icon">{f.icon}</span>
                  <span className="upgrade-feature-text">{f.text}</span>
                </div>
              ))}
            </div>

            {apiError && <div className="upgrade-error"><span>⚠</span> {apiError}</div>}

            {/* CTA */}
            <button
              className="upgrade-cta"
              onClick={handleUpgradeClick}
              disabled={loading}
            >
              {loading
                ? <><span className="upgrade-spinner" /> Starting…</>
                : 'Upgrade Now — £12.99 →'}
            </button>

            <div className="upgrade-guarantee">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              30-day money-back guarantee · No questions asked
            </div>
          </>
        )}

        {/* ── Step: payment ── */}
        {step === 'payment' && clientSecret && (
          <div className="upgrade-payment-body">
            <div className="upgrade-payment-header">
              <button className="upgrade-back" onClick={() => setStep('info')}>← Back</button>
              <div className="upgrade-payment-summary">
                <span>Day One Pass</span>
                <span className="upgrade-payment-price">£12.99</span>
              </div>
            </div>

            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: STRIPE_APPEARANCE }}
            >
              <UpgradePaymentForm
                email={currentUser?.email || ''}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          </div>
        )}

        {/* ── Step: success ── */}
        {step === 'success' && (
          <div className="upgrade-success">
            <div className="upgrade-success-icon">🎉</div>
            <h2 className="upgrade-success-title">You're Pro!</h2>
            <p className="upgrade-success-sub">
              All Pro features are now unlocked — including the Custom Challenge Creator.
            </p>
            <div className="upgrade-success-perks">
              <div className="upgrade-perk">✓ Lifetime access locked in</div>
              <div className="upgrade-perk">✓ Custom challenges unlocked</div>
              <div className="upgrade-perk">✓ Every future feature, forever</div>
            </div>
            <button className="upgrade-cta" onClick={() => { onClose(); onUpgraded?.() }}>
              Create a Custom Challenge →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
