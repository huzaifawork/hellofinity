import { useState } from 'react'

export default function HelpModal({ onClose }) {
  const [tab, setTab] = useState('what')
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header"><div className="modal-title">Help</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="help-tabs">
          <button className={`help-tab${tab === 'what' ? ' active' : ''}`} onClick={() => setTab('what')}>What is this?</button>
          <button className={`help-tab${tab === 'how' ? ' active' : ''}`} onClick={() => setTab('how')}>How it works</button>
        </div>
        {tab === 'what' && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1rem' }}>HelloFinity is a digital tracker for popular savings challenges. Pick a challenge, set a multiplier, and tick off your envelopes, weeks, or days as you save.</p>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>The <strong>100 Envelope Challenge</strong> has you save from £1 to £100. The <strong>52 Week Challenge</strong> has you save £1–£52 over a year. The <strong>365 Day Challenge</strong> has you save 1p–£3.65 daily.</p>
          </div>
        )}
        {tab === 'how' && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1rem' }}>Tap any envelope, week, or day to mark it as saved. Use the <strong>Random</strong> button to let the app pick one for you.</p>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>Use the <strong>multiplier</strong> to scale the amounts up or down. A 2× multiplier doubles every amount.</p>
          </div>
        )}
      </div>
    </div>
  )
}
