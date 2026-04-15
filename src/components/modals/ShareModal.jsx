import React, { useRef } from 'react'
import { fmt } from '../../utils/formatters'

export default function ShareModal({ challenge, challengeId, config, onClose }) {
  const previewRef = useRef(null)
  const [downloading, setDownloading] = React.useState(false)
  const m = challenge.multiplier
  const done = challenge.envelopes.filter(Boolean).length
  const saved = challenge.envelopes.reduce((s, v, i) => v ? s + config.slotValue(i, m) : s, 0)
  const pct = config.slots > 0 ? Math.round(done / config.slots * 100) : 0

  let miniCols = 10
  if (challenge.challengeType === 'week_52') miniCols = 13
  if (challenge.challengeType === 'day_365') miniCols = 20

  async function downloadShare() {
    setDownloading(true)
    try {
      if (!window.html2canvas) {
        await new Promise((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
          s.onload = res; s.onerror = rej
          document.head.appendChild(s)
        })
      }
      const canvas = await window.html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: '#22100C' })
      const link = document.createElement('a')
      link.download = `hellofinity-progress-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      alert('Could not generate image. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">Share your progress</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div ref={previewRef} className="share-preview">
          <div className="sc-header">
            <div className="sc-brand">Hello<span>Finity</span></div>
            <div className="sc-type">{config.label}</div>
          </div>
          <div className="sc-saved">{fmt(saved, challenge.currency)}</div>
          <div className="sc-meta">{done} of {config.slots} {config.slotLabelPlural} saved</div>
          <div className="sc-progress-track"><div className="sc-progress-fill" style={{ width: `${pct}%` }} /></div>
          <div className="sc-grid" style={{ gridTemplateColumns: `repeat(${miniCols}, 1fr)`, gap: challenge.challengeType === 'day_365' ? 2 : 3 }}>
            {challenge.envelopes.map((v, i) => (
              <div key={i} className={`sc-env${v ? ' done-cell' : ''}`} style={challenge.challengeType === 'day_365' ? { borderRadius: 2 } : {}} />
            ))}
          </div>
          <div className="sc-footer">hellofinity.com</div>
        </div>
        <div className="modal-actions">
          <button className="btn-primary btn-full" onClick={downloadShare} disabled={downloading}>{downloading ? 'Preparing…' : 'Download image'}</button>
          <button className="btn-secondary btn-full" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}


