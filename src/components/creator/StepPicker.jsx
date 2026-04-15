import { useState } from 'react'
import { generateAmounts } from '../../utils/tileCalculations'
import CheckoutModal from '../landing/CheckoutModal'

const TEMPLATES = [
  { id: 'holiday',   icon: '✈️', name: 'Holiday Fund',      sub: '12 tiles · £1,200', tiles: 12, target: 1200, spread: 'equal'     },
  { id: 'christmas', icon: '🎄', name: 'Christmas Savings', sub: '10 tiles · £500',   tiles: 10, target: 500,  spread: 'ascending'  },
  { id: 'emergency', icon: '🛡️', name: 'Emergency Fund',    sub: '6 tiles · £3,000',  tiles: 6,  target: 3000, spread: 'equal'      },
  { id: 'payday',    icon: '💰', name: 'Payday Challenge',  sub: '4 tiles · £400',    tiles: 4,  target: 400,  spread: 'equal'      },
]

export default function StepPicker({ state, dispatch, isPremium, precision, onNext }) {
  const [showCheckout, setShowCheckout] = useState(false)

  function handleTemplate(t) {
    if (!isPremium) { setShowCheckout(true); return }
    const amounts = generateAmounts(t.tiles, t.target, t.spread, precision)
    const base = [...amounts].sort((a, b) => a - b)
    dispatch({ type: 'APPLY_TEMPLATE', name: t.name, tiles: t.tiles, target: t.target, spread: t.spread })
    dispatch({ type: 'SET_AMOUNTS',      payload: amounts })
    dispatch({ type: 'SET_BASE_AMOUNTS', payload: base    })
    dispatch({ type: 'SET_STEP',         payload: 'preview' })
  }

  function handleMode(mode) {
    if (!isPremium) { setShowCheckout(true); return }
    dispatch({ type: 'SET_MODE', payload: mode })
    onNext(mode)
  }

  return (
    <div className="creator-body">
      <div className="creator-title">How do you want to build it?</div>
      <div className="creator-subtitle">
        Start from a template or build your own from scratch.
      </div>

      <div className="creator-section-label">Start from a template</div>
      <div className="template-grid">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            className={`template-card${!isPremium ? ' locked' : ''}`}
            onClick={() => handleTemplate(t)}
          >
            <div className="template-card-icon">{t.icon}</div>
            <div className="template-card-name">{t.name}</div>
            <div className="template-card-sub">{t.sub}</div>
            {!isPremium && <span className="template-lock">🔒</span>}
          </button>
        ))}
      </div>

      <div className="creator-section-label">Build your own</div>
      <div className="mode-grid">
        <button
          className={`mode-card${!isPremium ? ' locked' : ''}`}
          onClick={() => handleMode('auto')}
        >
          <div className="mode-card-icon">⚙️</div>
          <div className="mode-card-text">
            <div className="mode-card-title">Build it for me</div>
            <div className="mode-card-desc">Enter a tile count and target — we'll generate the amounts.</div>
          </div>
          {!isPremium && <span className="mode-card-lock">🔒</span>}
        </button>

        <button
          className={`mode-card${!isPremium ? ' locked' : ''}`}
          onClick={() => handleMode('manual')}
        >
          <div className="mode-card-icon">✏️</div>
          <div className="mode-card-text">
            <div className="mode-card-title">I'll build it myself</div>
            <div className="mode-card-desc">Enter each tile amount manually. Paste a list to import quickly.</div>
          </div>
          {!isPremium && <span className="mode-card-lock">🔒</span>}
        </button>
      </div>

      {!isPremium && (
        <div className="upgrade-prompt">
          <div className="upgrade-prompt-icon">⭐</div>
          <div className="upgrade-prompt-title">Custom challenges are a Pro feature</div>
          <div className="upgrade-prompt-sub">
            Upgrade to Day One to unlock custom challenges, unlimited tiles, and every future feature — one payment, forever.
          </div>
          <button className="btn-primary btn-full" onClick={() => setShowCheckout(true)}>
            Get Day One → £12.99
          </button>
        </div>
      )}

      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
    </div>
  )
}
