import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../../hooks/useToast'
import { sb } from '../../services/supabase'
import { CURRENCIES } from '../../utils/challengeConfigs'

export default function ChangeCurrencyModal({ onClose }) {
  const { state, dispatch } = useApp()
  const { showToast } = useToast()
  const [selected, setSelected] = useState(state.challenge?.currency || 'GBP')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!state.currentUser?.id) { showToast('Not signed in.'); return }
    setSaving(true)
    try {
      // 1. Update default currency on the profile
      await sb.from('profiles').upsert({
        id: state.currentUser.id,
        currency: selected,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      // 2. Update currency on the current active challenge so it persists after reload
      if (state.challengeId) {
        await sb.from('challenges')
          .update({ currency: selected, updated_at: new Date().toISOString() })
          .eq('id', state.challengeId)
          .eq('user_id', state.currentUser.id)
      }

      // 3. Reflect in UI state
      dispatch({ type: 'SET_CHALLENGE', payload: { currency: selected } })
      onClose()
      showToast(`Currency updated to ${selected} ✓`)
    } catch {
      showToast('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">Change currency</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1rem' }}>
          This changes how amounts are displayed. The numbers stay the same.
        </p>
        <div className="currency-grid">
          {Object.entries(CURRENCIES).map(([code, cur]) => (
            <button
              key={code}
              className={`currency-option${selected === code ? ' selected' : ''}`}
              onClick={() => setSelected(code)}
            >
              {cur.symbol} {code}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn-primary btn-full" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn-secondary btn-full" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
