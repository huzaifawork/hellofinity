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
          <div className="help-content-fade">
            <h2 className="help-title-large">What is HelloFinity.</h2>
            <p className="help-sub-desc">Everything you need to know to get the most out of it.</p>
            
            <div className="help-section">
              <h3 className="help-section-title">A digital tracker</h3>
              <p className="help-section-text">HelloFinity is a digital tracker for popular savings challenges. Pick a challenge, set a multiplier, and tick off your envelopes, weeks, or days as you save.</p>
            </div>

            <div className="help-section">
              <h3 className="help-section-title">The challenges</h3>
              <p className="help-section-text">The <strong>100 Envelope Challenge</strong> has you save from £1 to £100. The <strong>52 Week Challenge</strong> has you save £1–£52 over a year. The <strong>365 Day Challenge</strong> has you save 1p–£3.65 daily.</p>
            </div>
          </div>
        )}
        {tab === 'how' && (
          <div className="help-content-fade">
            <h2 className="help-title-large">How to use HelloFinity.</h2>
            <p className="help-sub-desc">Everything you need to know to get the most out of it.</p>

            <div className="help-section">
              <h3 className="help-section-title">Starting a challenge</h3>
              <p className="help-section-text">From the dashboard, tap "Add a challenge." Choose your challenge type, give it a goal if you like (e.g. a holiday, a car, an emergency fund), pick your multiplier and currency, and you're in. Your progress is saved automatically.</p>
            </div>

            <div className="help-section">
              <h3 className="help-section-title">Marking a save</h3>
              <p className="help-section-text">Open a challenge and tap any tile to mark it as saved; that's the amount you've set aside. Tap it again to undo. Remember to actually move the money to your savings account or cash envelope at the same time.</p>
            </div>

            <div className="help-section">
              <h3 className="help-section-title">Random picker</h3>
              <p className="help-section-text">Not sure which tile to pick? Hit "Pick one for me" and we'll choose a remaining tile at random. Perfect for payday; it takes the decision out of it and makes saving feel more like a game.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
