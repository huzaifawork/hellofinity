import { useState } from 'react'
import { fmt } from '../../utils/formatters'

// Singleton pattern — ChallengeScreen calls showCompleteBanner(...)
let _setVisible = null
let _setData = null

export function showCompleteBanner(config, challenge, onStartNew, onArchiveDash) {
  if (!_setVisible || !_setData) return
  const m = challenge.multiplier
  let saved = 0
  challenge.envelopes.forEach((v, i) => { if (v) saved += config.slotValue(i, m) })

  const startDate = challenge.startedAt
    ? new Date(challenge.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'
  const daysTaken = challenge.startedAt
    ? Math.max(1, Math.round((Date.now() - new Date(challenge.startedAt).getTime()) / 86400000))
    : '—'
  const daysLabel = daysTaken === 1 ? 'day' : 'days'

  _setData({
    sub: `You saved ${fmt(saved, challenge.currency)}. Every single ${config.slotLabel}. Incredible.`,
    saved, daysTaken, daysLabel, startDate, slots: config.slots, currency: challenge.currency,
    onStartNew, onArchiveDash,
  })
  _setVisible(true)
}

export default function CompleteBanner() {
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState(null)
  const [archiving, setArchiving] = useState(false)

  _setVisible = setVisible
  _setData = setData

  async function handleArchiveDash() {
    setArchiving(true)
    try { await data?.onArchiveDash?.() }
    finally { setArchiving(false); setVisible(false) }
  }

  async function handleStartNew() {
    setVisible(false)
    await data?.onStartNew?.()
  }

  if (!visible || !data) return null

  return (
    <div className="complete-banner visible">
      <div className="cb-icon">🎉</div>
      <div className="cb-title">Challenge complete!</div>
      <div className="cb-sub">{data.sub}</div>

      <div className="complete-summary-grid">
        <div className="csm-cell">
          <div className="csm-label">Total saved</div>
          <div className="csm-value" style={{ color: 'var(--celadon)' }}>{fmt(data.saved, data.currency)}</div>
        </div>
        <div className="csm-cell">
          <div className="csm-label">Time taken</div>
          <div className="csm-value">
            {data.daysTaken} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>{data.daysLabel}</span>
          </div>
        </div>
        <div className="csm-cell">
          <div className="csm-label">Started</div>
          <div className="csm-value" style={{ fontSize: 14 }}>{data.startDate}</div>
        </div>
        <div className="csm-cell">
          <div className="csm-label">Tiles completed</div>
          <div className="csm-value">{data.slots}</div>
        </div>
      </div>

      <div className="cb-actions">
        <button className="cb-btn cb-btn-primary" onClick={handleStartNew}>Start a new challenge</button>
        <button className="cb-btn cb-btn-secondary" onClick={handleArchiveDash} disabled={archiving}>
          {archiving ? 'Archiving…' : 'Archive & go to dashboard'}
        </button>
      </div>
    </div>
  )
}
