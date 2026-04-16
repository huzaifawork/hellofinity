import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/landing.css'
import InteractiveDemo from '../components/landing/InteractiveDemo'
import CheckoutModal from '../components/landing/CheckoutModal'

// Share card preview static component
function ShareCardPreview() {
  const filled = new Set([0,2,4,5,8,11,14,16,19,21,24,27,30,33,36,39,42,45,48,51,54,57,60,63,66,69,72,75,78,81,84,87])
  return (
    <div className="sharecard-preview">
      <div className="sc-top">
        <div className="sc-brand">
          <span className="sc-hello">Hello</span><span className="sc-finity">Finity</span>
        </div>
        <div className="sc-type">100 Envelope Challenge</div>
      </div>
      <div className="sc-mini">
        {Array.from({ length: 100 }, (_, i) => (
          <div key={i} className={`sc-dot ${filled.has(i) ? 'filled' : 'empty'}`} />
        ))}
      </div>
      <div className="sc-bottom">
        <div>
          <div className="sc-amount">£1,353</div>
          <div className="sc-saved-label">saved so far</div>
        </div>
        <div className="sc-meta">
          <div className="sc-pct">32%</div>
          <div className="sc-count">32 of 100 envelopes</div>
          <div className="sc-url">hellofinity.com</div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const observerRef = useRef(null)
  const [showCheckout, setShowCheckout] = useState(false)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const elements = document.querySelectorAll('.fade-in')
    elements.forEach(el => el.classList.add('will-animate'))
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observerRef.current?.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1, rootMargin: '50px' })
    elements.forEach(el => observerRef.current.observe(el))
    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <>
      {/* ── Header ── */}
      <header className="site-header">
        <div className="header-inner">
          <a href="#" className="header-logo">
            <span className="hello">Hello</span><span className="finity">Finity</span>
          </a>
          <nav className="header-nav">
            <a href="#how">How it works</a>
            <a href="#challenges">Challenges</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="header-right">
            <button className="btn-login" onClick={() => navigate('/app')}>Log in</button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="container">
          <div className="hero-kicker">Track your savings challenges</div>
          <h1 className="hero-title">Your savings challenge, <em>sorted.</em></h1>
          <p className="hero-sub">Pick a challenge. Tap an envelope whenever you save. Watch your total grow. Simple, visual, satisfying.</p>
          <div className="hero-ctas">
            <a href="#waitlist" className="btn-cta">Join the waitlist →</a>
          </div>
          <p className="hero-note">Be first to know when we launch.</p>
        </div>
      </section>

      {/* ── Interactive Demo ── */}
      <section className="demo-section">
        <div className="container">
          <InteractiveDemo />
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="how-section" id="how">
        <div className="container">
          <div className="section-label">How it works</div>
          <div className="section-title">Three steps. That's it.</div>
          <div className="section-sub">Just a challenge and a tap.</div>
          <div className="how-grid">
            {[
              { n: '1', title: 'Choose your challenge', body: '100 envelopes, 52 weeks, or 365 days. Pick a multiplier to scale the amounts up or down.' },
              { n: '2', title: 'Save and tap', body: "Whenever you set money aside, tap the matching cell. Use the random picker if you can't decide how much to save. Every tap shows your progress." },
              { n: '3', title: 'Watch it grow', body: 'Your dashboard tracks every penny. Hit milestones, share your progress, and celebrate when you fill every single one.' },
            ].map((c, i) => (
              <div key={i} className={`how-card fade-in stagger-${i + 1}`}>
                <div className="how-num">{c.n}</div>
                <div className="how-card-title">{c.title}</div>
                <div className="how-card-body">{c.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Challenge Types ── */}
      <section className="types-section" id="challenges">
        <div className="container">
          <div className="section-label">Pick your challenge</div>
          <div className="section-title">Three ways to save.</div>
          <div className="section-sub">Different paces, different amounts, same satisfying feeling.</div>
          <div className="types-grid">
            {[
              { icon: '✉️', cls: 'env', title: '100 Envelopes', desc: 'The classic. 100 envelopes numbered £1 to £100. Fill them in any order. Scale up or down with a multiplier.', total: 'Save up to £5,050' },
              { icon: '📅', cls: 'week', title: '52 Weeks', desc: 'One year, 52 weeks, £1 to £52. Grouped by quarter so you can see where you are at a glance.', total: 'Save up to £1,378' },
              { icon: '☀️', cls: 'day', title: '365 Days', desc: 'A penny challenge for every day of the year. The months match when you actually started.', total: 'Save up to £667.95' },
            ].map((c, i) => (
              <div key={i} className={`type-card fade-in stagger-${i + 1}`}>
                <div className={`type-card-icon ${c.cls}`}>{c.icon}</div>
                <div className="type-card-title">{c.title}</div>
                <div className="type-card-desc">{c.desc}</div>
                <div className="type-card-total">{c.total}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Share Card Preview ── */}
      <section className="sharecard-section">
        <div className="container">
          <div className="sharecard-wrap fade-in">
            <div className="sharecard-text">
              <div className="section-label">Show off your progress</div>
              <div className="section-title">Beautiful share cards to show your progress.</div>
              <div className="section-sub">Downloadable progress images for you to post. Your grid, your stats, your progress.</div>
            </div>
            <ShareCardPreview />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-label">What you get</div>
          <div className="section-title">Built for savers.</div>
          <div className="section-sub">Everything you need to start, track, and finish a savings challenge.</div>
          <div className="features-grid">
            {[
              { icon: '🎲', name: 'Random picker', desc: "Can't decide? Let us pick one for you. It makes saving feel more like a game than a chore." },
              { icon: '📊', name: 'Dashboard', desc: 'See your total saved, challenges completed, and how long you\'ve been going. All in one place.' },
              { icon: '🏆', name: 'Milestones', desc: 'Celebrate hitting each milestone!' },
              { icon: '📱', name: 'Share cards', desc: 'Beautiful, downloadable progress images for you to post. Your grid, your stats, your progress.' },
              { icon: '🌙', name: 'Dark mode', desc: 'Light and dark themes. Choose your fancy.' },
              { icon: '💱', name: 'Multiple currencies', desc: 'Save in pounds, dollars, euros, yen, and more. Your challenge, your currency.' },
            ].map((f, i) => (
              <div key={i} className="feature-item fade-in">
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-text">
                  <div className="feature-name">{f.name}</div>
                  <div className="feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Always improving banner ── */}
      <section style={{ padding: '36px 0', background: 'var(--dark)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-label" style={{ color: 'var(--sun)' }}>Always improving</div>
          <div className="section-title" style={{ margin: '0 auto 8px', color: 'var(--bg)' }}>This is just the beginning.</div>
          <div style={{ fontSize: 15, color: 'rgba(245,242,237,0.55)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            HelloFinity is a growing platform. Your feedback shapes what gets built next.
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="pricing-section" id="pricing">
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-label">Pricing</div>
          <div className="section-title" style={{ margin: '0 auto 8px' }}>Less than a single printable. For a whole year.</div>
          <div className="section-sub" style={{ margin: '0 auto' }}>Start for free. Upgrade when you're ready.</div>
          <div className="pricing-grid" style={{ marginTop: 24 }}>

            {/* Free */}
            <div className="pricing-card">
              <div className="pricing-name">Free</div>
              <div className="pricing-desc">Try it properly before you pay anything.</div>
              <div className="pricing-price">£0</div>
              <ul className="pricing-features">
                {['1 active challenge','100 Envelope Challenge','Random picker','Dashboard and milestones','Dark mode','Multiple currencies'].map(f => <li key={f}>{f}</li>)}
              </ul>
              <button className="pricing-btn light" onClick={() => document.getElementById('email-input')?.focus()}>Join the waitlist</button>
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--hint)' }}>Launching May 2026. Join the waitlist to be first.</div>
            </div>

            {/* Day One */}
            <div className="pricing-card featured">
              <div className="pricing-ribbon">First 200 only</div>
              <div className="pricing-name">Day One</div>
              <div className="pricing-desc">Pay once. Get everything. Forever.</div>
              <div>
                <span className="pricing-price">£12.99</span>
                <span className="pricing-period"> once</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(245,242,237,0.35)', marginTop: 6, textDecoration: 'line-through' }}>
                Pro is £14.99/year. Day One members never pay again
              </div>
              <ul className="pricing-features">
                {['Unlimited challenges','All challenges including 52 Week + 365 Days','Shareable progress cards','Cloud sync across devices','Every future feature, forever','Direct feedback channel'].map(f => <li key={f}>{f}</li>)}
              </ul>
              <button className="pricing-btn outline" onClick={() => setShowCheckout(true)}>Get Day One →</button>
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'rgba(245,242,237,0.3)' }}>Launching May 2026. Pay now, access on launch day.</div>
            </div>

            {/* Pro */}
            <div className="pricing-card" style={{ opacity: 0.75 }}>
              <div className="pricing-name">Pro</div>
              <div className="pricing-desc">After the first 200 Day One members.</div>
              <div>
                <span className="pricing-price">£14.99</span>
                <span className="pricing-period">/year</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--hint)', marginTop: 6 }}>That's £1.25/month</div>
              <ul className="pricing-features">
                {['Unlimited challenges','All challenges including 52 Week + 365 Days','Shareable progress cards','Cloud sync across devices','All new features as they ship'].map(f => <li key={f}>{f}</li>)}
              </ul>
              <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                Available once Day One passes sell out
              </div>
              <div style={{ textAlign: 'center', marginTop: 4, fontSize: 11, color: 'var(--hint)' }}>Cancel anytime. Your data stays.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Waitlist / Email ── */}
      <section className="email-section" id="waitlist">
        <div className="container">
          <div className="email-card fade-in">
            <div className="section-title">Get in early.</div>
            <div className="section-sub">
              Join the waitlist and be the first to know when the Day One pass goes live. Only 200 available.
            </div>
            <form
              className="email-form"
              action="https://app.kit.com/forms/9290765/subscriptions"
              method="POST"
            >
              <input
                type="email"
                className="email-input"
                name="email_address"
                id="email-input"
                placeholder="you@example.com"
                required
              />
              <button type="submit" className="email-submit">Notify me →</button>
            </form>
            <p className="email-note">No spam. Just a heads-up when it's ready.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="site-footer">
        <div className="container">
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, letterSpacing: '-0.02em' }}>
              <span style={{ color: 'var(--sun)' }}>Hello</span>
              <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>Finity</span>
            </span>
          </div>
          <div className="footer-links">
            <a href="/app/privacy" onClick={e => { e.preventDefault(); navigate('/app/privacy') }}>Privacy</a>
            <a href="/app/terms" onClick={e => { e.preventDefault(); navigate('/app/terms') }}>Terms</a>
            <a href="mailto:hello@hellofinity.com">Contact</a>
          </div>
          <div>HelloFinity · Your savings challenges, sorted.</div>
        </div>
      </footer>

      {/* Stripe checkout modal */}
      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
    </>
  )
}
