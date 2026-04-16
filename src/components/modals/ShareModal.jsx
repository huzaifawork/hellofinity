import React, { useRef } from 'react'
import { fmt } from '../../utils/formatters'
import { gridCols as customGridCols } from '../../utils/tileCalculations'

const MARK_LIGHT = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMjIxMDBDIi8+PGxpbmUgeDE9IjI1IiB5MT0iMjAiIHgyPSIyNSIgeTI9IjgwIiBzdHJva2U9IiNGNUYyRUQiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxsaW5lIHgxPSI1MCIgeTE9IjIwIiB4Mj0iNTAiIHkyPSI4MCIgc3Ryb2tlPSIjRjVGMkVEIiBzdHJva2Utd2lkdGg9IjEwIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48bGluZSB4MT0iNTAiIHkxPSIyMCIgeDI9Ijc1IiB5Mj0iMjAiIHN0cm9rZT0iI0Y1RjJFRCIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTE4IDU1IFE0NSA3OCA4NSA1MCIgc3Ryb2tlPSIjRjVDODQyIiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==`

export default function ShareModal({ challenge, challengeId, config, onClose }) {
  const previewRef = useRef(null)
  const [downloading, setDownloading] = React.useState(false)
  const m = challenge.multiplier

  // ── Fix: for custom challenges config.slots is 0, use envelopes.length ──
  const isCustom = challenge.challengeType === 'custom'
  const customAmounts = isCustom ? (challenge.customAmounts || []) : []
  const totalSlots = isCustom ? customAmounts.length : config.slots

  function slotVal(i) {
    return isCustom ? (customAmounts[i] ?? 0) : config.slotValue(i, m)
  }

  const done  = challenge.envelopes.filter(Boolean).length
  const saved = challenge.envelopes.reduce((s, v, i) => v ? s + slotVal(i) : s, 0)
  const pct   = totalSlots > 0 ? Math.round(done / totalSlots * 100) : 0

  // ── Grid columns for share card mini grid ──
  let miniCols = 10
  if (challenge.challengeType === 'week_52')  miniCols = 13
  if (challenge.challengeType === 'day_365')  miniCols = 20
  if (isCustom) miniCols = customGridCols(totalSlots)

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
      const canvas = await window.html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#22100C',
      })
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

  // ── Inline styles (all hardcoded colors so html2canvas renders correctly) ──
  const S = {
    card: {
      background: '#22100C',
      padding: '28px 24px',
      borderRadius: '16px',
      marginBottom: '24px', // Space between the card and the Save button
    },
    // Logo row
    logoWrap: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '18px',
    },
    logoText: {
      fontFamily: "'Playfair Display', 'Georgia', serif",
      fontSize: '28px',
      lineHeight: 1,
      letterSpacing: '-0.02em',
    },
    helloSpan: { color: '#F5C842', fontWeight: 600, fontStyle: 'italic' },
    finitySpan: { color: '#F5F2ED', fontStyle: 'italic' },
    // Challenge type label
    typeLabel: {
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'rgba(245,242,237,0.4)',
      marginBottom: '16px',
      lineHeight: 1,
    },
    // Grid wrapper — use flex for html2canvas compatibility
    gridWrap: (gap) => ({
      display: 'flex',
      flexWrap: 'wrap',
      gap: `${gap}px`,
      marginBottom: '24px',
    }),
    // Bottom row
    bottomRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    savedAmt: {
      fontFamily: "'Playfair Display', 'Georgia', serif",
      fontSize: '40px',
      color: '#F5C842',
      letterSpacing: '-0.02em',
      lineHeight: 0.9,
    },
    metaRight: { textAlign: 'right', minWidth: '120px' },
    metaText: {
      fontSize: '11px',
      color: 'rgba(245,242,237,0.45)',
      marginBottom: '8px',
    },
    progressTrack: {
      height: '4px',
      background: 'rgba(245,242,237,0.12)',
      borderRadius: '100px',
      overflow: 'hidden',
      width: '100%',
    },
    progressFill: {
      height: '100%',
      background: '#F5C842',
      borderRadius: '100px',
      width: `${pct}%`,
    },
  }

  const cellGap = challenge.challengeType === 'day_365' ? 2 : 4
  const cellRadius = challenge.challengeType === 'day_365' ? 2 : 4

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 1100 }}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">Show off your progress.</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-sub">Here's where you're at. Download it and share it wherever you like.</div>

        {/* ── Share card preview (this div gets exported as image) ── */}
        <div ref={previewRef} style={S.card}>
          {/* Logo */}
          <div style={S.logoWrap}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style={{ width: 24, height: 24 }}>
              <rect width="100" height="100" rx="20" fill="#22100C"/>
              <line x1="25" y1="20" x2="25" y2="80" stroke="#F5F2ED" strokeWidth="10" strokeLinecap="round"/>
              <line x1="50" y1="20" x2="50" y2="80" stroke="#F5F2ED" strokeWidth="10" strokeLinecap="round"/>
              <line x1="50" y1="20" x2="75" y2="20" stroke="#F5F2ED" strokeWidth="10" strokeLinecap="round"/>
              <path d="M18 55 Q45 78 85 50" stroke="#F5C842" strokeWidth="8" strokeLinecap="round" fill="none"/>
            </svg>
            <div style={S.logoText}>
              <span style={S.helloSpan}>Hello</span>
              <span style={S.finitySpan}>Finity</span>
            </div>
          </div>

          {/* Challenge type */}
          <div style={S.typeLabel}>{config.label}</div>

          {/* Mini grid */}
          <div style={S.gridWrap(cellGap)}>
            {challenge.envelopes.map((v, i) => {
              const pctW = 100 / miniCols
              const gapOffset = cellGap * (miniCols - 1) / miniCols
              const w = `calc(${pctW}% - ${gapOffset}px)`
              return (
                <div key={i} style={{
                  width: w,
                  aspectRatio: '1 / 1',
                  borderRadius: cellRadius,
                  background: v ? '#F5C842' : 'rgba(245,242,237,0.08)',
                }} />
              )
            })}
          </div>

          {/* Bottom: amount + meta */}
          <div style={S.bottomRow}>
            <div style={S.savedAmt}>
              {fmt(saved, challenge.currency)}
            </div>
            <div style={S.metaRight}>
              <div style={S.metaText}>
                {done} of {totalSlots} {config.slotLabelPlural} saved
              </div>
              <div style={S.progressTrack}>
                <div style={S.progressFill} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn-primary btn-full" onClick={downloadShare} disabled={downloading}>
            {downloading ? 'Preparing…' : 'Save image'}
          </button>
          <button className="btn-secondary btn-full" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
