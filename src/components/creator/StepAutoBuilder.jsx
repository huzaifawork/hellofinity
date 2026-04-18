import { useState, useEffect } from 'react'
import { CURRENCIES } from '../../utils/challengeConfigs'
import { generateAmounts } from '../../utils/tileCalculations'
import { validateTiles, validateTarget, getAutoHint } from '../../utils/creatorValidation'
import { fmt } from '../../utils/formatters'

const SPREADS = [
  { id: 'equal',      name: 'Equal',      desc: 'Same amount every tile'  },
  { id: 'ascending',  name: 'Ascending',  desc: 'Smallest to largest'     },
  { id: 'descending', name: 'Descending', desc: 'Largest to smallest'     },
  { id: 'random',     name: 'Random',     desc: 'Shuffled amounts'         },
]

export default function StepAutoBuilder({ state, dispatch, precision, currency, onNext }) {
  const [generated, setGenerated] = useState(state.amounts.length > 0)
  const symbol = CURRENCIES[currency]?.symbol || '£'

  const tilesV  = validateTiles(state.tilesInput)
  const targetV = validateTarget(state.targetInput)
  // Trigger only when BOTH tiles AND target are valid numbers
  const canGenerate = tilesV.valid && targetV.valid && state.tiles !== null && state.target !== null
  const hint = getAutoHint(state.tiles, state.target, precision)

  function handleGenerate() {
    if (!canGenerate) return
    const amounts = generateAmounts(state.tiles, state.target, state.spread, precision)
    const base = state.spread === 'random'
      ? generateAmounts(state.tiles, state.target, 'ascending', precision)
      : [...amounts]
    dispatch({ type: 'SET_AMOUNTS',      payload: amounts })
    dispatch({ type: 'SET_BASE_AMOUNTS', payload: base    })
    setGenerated(true)
  }

  // Auto-generate when inputs change if we've already generated before
  useEffect(() => {
    if (canGenerate && (generated || (state.tilesInput && state.targetInput))) {
      handleGenerate()
    }
  }, [state.tiles, state.target, state.spread, precision])

  // Is the current preview out of sync with current inputs?
  const isStale = generated && canGenerate && (
    state.amounts.length !== state.tiles || 
    Math.abs(state.amounts.reduce((s, v) => s + v, 0) - state.target) > 0.01
  )

  const canProceed = generated && state.amounts.length > 0

  return (
    <div className="creator-body">
      <div className="creator-title">Build it for me.</div>
      <div className="creator-subtitle">
        Fill in the tile count and your target total, then choose how to spread the amounts.
      </div>

      <label className="form-label">Number of tiles</label>
      <input
        className={`form-input${state.tilesInput && !tilesV.valid ? ' input-error' : ''}`}
        type="number" min="2" max="200" step="1"
        placeholder="e.g. 12"
        value={state.tilesInput}
        onChange={e => dispatch({ type: 'SET_TILES_INPUT', payload: e.target.value })}
      />
      {state.tilesInput && tilesV.message && (
        <div className={tilesV.type === 'soft' ? 'creator-hint' : 'creator-hint-error'}>
          {tilesV.message}
        </div>
      )}

      <label className="form-label" style={{ marginTop: 20 }}>Target total ({symbol})</label>
      <input
        className={`form-input${state.targetInput && !targetV.valid ? ' input-error' : ''}`}
        type="number" min="0.01" step="0.01"
        placeholder={`e.g. ${symbol}1200`}
        value={state.targetInput}
        onChange={e => dispatch({ type: 'SET_TARGET_INPUT', payload: e.target.value })}
      />
      {state.targetInput && targetV.message && (
        <div className={targetV.type === 'soft' ? 'creator-hint' : 'creator-hint-error'}>
          {targetV.message}
        </div>
      )}
      {hint && <div className="creator-hint">{hint}</div>}

      <div className="creator-section-label">Spread</div>
      <div className="spread-grid">
        {SPREADS.map(s => (
          <button
            key={s.id}
            className={`spread-option${state.spread === s.id ? ' selected' : ''}`}
            onClick={() => dispatch({ type: 'SET_SPREAD', payload: s.id })}
          >
            <div className="spread-option-name">{s.name}</div>
            <div className="spread-option-desc">{s.desc}</div>
          </button>
        ))}
      </div>

      {generated && state.amounts.length > 0 && (
        <div className="creator-generate-result">
          <div className="preview-count-label" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Generated {state.amounts.length} tiles
          </div>
          <div className="preview-total" style={{ fontSize: 24 }}>
            {fmt(state.amounts.reduce((s, v) => s + v, 0), currency)} total
          </div>
        </div>
      )}

      <div className="creator-footer">
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn-secondary${isStale ? ' pulse-button' : ''}`}
            style={{ flex: 1, marginTop: 0 }}
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            {generated ? 'Regenerate' : 'Generate'}
          </button>
          {canProceed && (
            <button className="btn-primary" style={{ flex: 1 }} onClick={onNext}>
              Preview →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
