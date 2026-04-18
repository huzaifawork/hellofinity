import { useState } from 'react'
import { parsePaste } from '../../utils/tileCalculations'
import { validateAmounts } from '../../utils/creatorValidation'
import { fmt } from '../../utils/formatters'

export default function StepManualBuilder({ state, dispatch, currency, onNext }) {
  const [pasteHint, setPasteHint] = useState('')

  function commitAmounts() {
    const committed = state.manualInputs
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v) && v >= 0.01)
    dispatch({ type: 'COMMIT_MANUAL_AMOUNTS', payload: committed })
  }

  function handlePaste(e) {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const parsed = parsePaste(text)
    if (parsed.length === 0) {
      setPasteHint("None of those looked like valid amounts. Try numbers separated by commas.")
      return
    }
    setPasteHint('')
    dispatch({ type: 'PASTE_AMOUNTS', payload: parsed })
  }

  function handleSwitchToAuto() {
    if (!window.confirm('This will replace your tiles with generated amounts. Continue?')) return
    dispatch({ type: 'SET_MODE', payload: 'auto' })
    dispatch({ type: 'SET_STEP', payload: 'auto' })
  }

  const liveTotal = state.manualInputs.reduce((s, v) => {
    const n = parseFloat(v)
    return s + (isNaN(n) ? 0 : n)
  }, 0)

  const committed = state.manualInputs.map(v => parseFloat(v)).filter(v => !isNaN(v) && v >= 0.01)
  const validation = validateAmounts(committed)
  const canProceed = validation.valid

  return (
    <div className="creator-body">
      <div className="creator-title">Build it yourself.</div>
      <div className="creator-subtitle">
        Add tiles one by one, or paste a comma-separated list to import all at once.
      </div>

      <label className="form-label">
        Paste amounts <span className="form-optional">(optional)</span>
      </label>
      <textarea
        className="form-input"
        rows={2}
        placeholder="e.g. 10, 25, 50, 100 — or one per line"
        onPaste={handlePaste}
        style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13, minHeight: 70 }}
        readOnly
      />
      {pasteHint && <div className="creator-hint-error">{pasteHint}</div>}

      <div className="creator-section-label">
        Tiles ({state.manualInputs.length})
      </div>

      <div className="manual-tile-list">
        {state.manualInputs.map((val, i) => (
          <div key={i} className="manual-tile-row">
            <span className="manual-tile-num">{i + 1}</span>
            <input
              className={`form-input manual-tile-input${val !== '' && parseFloat(val) < 0.01 ? ' input-error' : ''}`}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={val}
              onChange={e => dispatch({ type: 'UPDATE_MANUAL_INPUT', index: i, value: e.target.value })}
              onBlur={commitAmounts}
              aria-label={`Tile ${i + 1} amount`}
            />
            <button
              className="manual-tile-remove"
              aria-label={`Remove tile ${i + 1}`}
              onClick={() => dispatch({ type: 'REMOVE_MANUAL_TILE', index: i })}
            >×</button>
          </div>
        ))}
      </div>

      <button
        className="manual-add-btn"
        onClick={() => dispatch({ type: 'ADD_MANUAL_TILE' })}
      >
        + Add tile
      </button>

      <div className="manual-total-bar" style={{ padding: '16px 0', borderTop: '1px solid var(--border-md)' }}>
        <span className="manual-total-label" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {state.manualInputs.length} tiles · total
        </span>
        <span className="manual-total-value" style={{ fontSize: 18 }}>{fmt(liveTotal, currency)}</span>
      </div>

      {state.manualInputs.length >= 2 && !canProceed && (
        <div className="creator-hint-error">Each tile needs a value of at least 1p.</div>
      )}

      {state.previousAmounts.length > 0 && (
        <button
          className="forgot-link"
          style={{ textAlign: 'left', marginBottom: 8 }}
          onClick={() => dispatch({ type: 'UNDO' })}
        >
          ↩ Undo last change
        </button>
      )}

      <button
        className="forgot-link"
        style={{ textAlign: 'left' }}
        onClick={handleSwitchToAuto}
      >
        Switch to auto-generate instead
      </button>

      <div className="creator-footer">
        <button
          className="btn-primary btn-full"
          onClick={() => { commitAmounts(); onNext() }}
          disabled={!canProceed}
        >
          Preview challenge →
        </button>
      </div>
    </div>
  )
}
