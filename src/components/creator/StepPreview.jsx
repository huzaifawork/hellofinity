import { fmt, fmtCompact } from '../../utils/formatters'
import { gridCols, fisherYates } from '../../utils/tileCalculations'

export default function StepPreview({ state, dispatch, currency, isCreating, onEdit, onCreate }) {
  const { amounts, baseAmounts, spread } = state
  const total = amounts.reduce((s, v) => s + v, 0)
  const cols  = gridCols(amounts.length)

  function handleShuffle() {
    const reshuffled = fisherYates([...baseAmounts])
    dispatch({ type: 'SET_AMOUNTS', payload: reshuffled })
  }

  return (
    <div className="creator-body">
      <div className="creator-title">Looking good.</div>
      <div className="creator-subtitle">
        Review your tiles, then create your challenge. You can edit it anytime.
      </div>

      <div className="preview-stats">
        <div>
          <div className="preview-total">{fmt(total, currency)}</div>
          <div className="preview-total-label">total to save</div>
        </div>
        <div className="preview-count">
          <div className="preview-count-num">{amounts.length}</div>
          <div className="preview-count-label">tiles</div>
        </div>
      </div>

      <div
        className="preview-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {amounts.map((v, i) => (
          <div key={i} className="preview-tile">
            {fmtCompact(v, currency)}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {spread === 'random' && (
          <button className="btn-secondary" style={{ flex: 1 }} onClick={handleShuffle}>
            🎲 Shuffle
          </button>
        )}
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onEdit}>
          ✏️ Edit tiles
        </button>
      </div>

      <div className="creator-footer">
        <button
          className="btn-primary btn-full"
          onClick={onCreate}
          disabled={isCreating}
        >
          {isCreating
            ? <><span className="co-spinner" style={{ marginRight: 8 }} /> Creating…</>
            : 'Create challenge →'
          }
        </button>
        {!isCreating && (
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--hint)' }}>
            Tap "Edit tiles" to make changes before creating.
          </div>
        )}
      </div>
    </div>
  )
}
