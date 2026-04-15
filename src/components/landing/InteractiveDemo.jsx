import { useState, useEffect, useRef } from 'react'

const DEMO_SLOTS = 25
const PREFILL = new Set([0, 2, 4, 8, 11, 14, 16, 19, 21, 24])

export default function InteractiveDemo() {
  const [cells, setCells] = useState(() => Array(DEMO_SLOTS).fill(false).map((_, i) => PREFILL.has(i)))
  const [highlighted, setHighlighted] = useState(null)
  const [randResult, setRandResult] = useState(null)
  const [popping, setPopping] = useState(null)

  const total = 325 // sum 1..25
  const done = cells.filter(Boolean).length
  const saved = cells.reduce((s, v, i) => v ? s + (i + 1) : s, 0)
  const pct = Math.round((done / DEMO_SLOTS) * 100)

  function toggleCell(i) {
    setCells(prev => {
      const next = [...prev]
      next[i] = !next[i]
      return next
    })
    if (highlighted === i) setHighlighted(null)
    setPopping(i)
    setTimeout(() => setPopping(p => p === i ? null : p), 350)
  }

  function pickRandom() {
    const remaining = cells.map((v, i) => (!v ? i : null)).filter(v => v !== null)
    if (!remaining.length) return
    const pick = remaining[Math.floor(Math.random() * remaining.length)]
    setHighlighted(pick)
    setRandResult(pick)
  }

  return (
    <div className="demo-wrap fade-in">
      <div className="demo-header">
        <div className="demo-badge">Try it — tap the envelopes</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{done} of 25</div>
      </div>

      <div className="demo-stats">
        <div className="demo-stat hero-stat">
          <div className="demo-stat-label">Total saved</div>
          <div className="demo-stat-val">£{saved.toLocaleString()}</div>
          <div className="demo-stat-sub">of £325</div>
        </div>
        <div className="demo-stat">
          <div className="demo-stat-val" style={{ color: 'var(--celadon)' }}>{done}</div>
          <div className="demo-stat-label">Filled</div>
        </div>
        <div className="demo-stat">
          <div className="demo-stat-val">£{(total - saved).toLocaleString()}</div>
          <div className="demo-stat-label">To go</div>
        </div>
        <div className="demo-stat">
          <div className="demo-stat-val" style={{ color: 'var(--muted)' }}>{pct}%</div>
          <div className="demo-stat-label">Progress</div>
        </div>
      </div>

      <div className="demo-progress">
        <div className="demo-progress-track">
          <div className="demo-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="demo-rand">
        <div className="demo-rand-inner">
          <div className="demo-rand-eyebrow">Random picker</div>
          <div className={`demo-rand-result${randResult !== null ? ' has-result' : ''}`}>
            {randResult !== null ? `£${randResult + 1}` : '—'}
          </div>
          <div className="demo-rand-sub">
            {randResult !== null
              ? `Set aside £${randResult + 1}. Tap envelope #${randResult + 1} to tick it off.`
              : "Not sure which one? Let us pick."}
          </div>
        </div>
        <button className="demo-rand-btn" onClick={pickRandom}>Pick one for me</button>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="demo-grid">
          {cells.map((done, i) => (
            <div
              key={i}
              className={[
                'demo-cell',
                done ? 'done' : '',
                highlighted === i ? 'highlighted' : '',
                popping === i ? 'popping' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => toggleCell(i)}
            >
              <span className="cell-tick">✓</span>
              <span className="cell-num">{i + 1}</span>
              <span className="cell-amt">£{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="demo-footer">
        {done > 0 ? `${done} of 25 filled` : 'Tap a tile to try it out'}
      </div>
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--hint)' }}>
        This is a preview. The full challenge has 100 tiles.
      </div>
    </div>
  )
}
