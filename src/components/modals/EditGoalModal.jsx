import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../../hooks/useToast'
import { sb } from '../../services/supabase'

export default function EditGoalModal({ onClose }) {
  const { state, dispatch } = useApp()
  const { showToast } = useToast()
  const [goal, setGoal] = useState(state.challenge.goal || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await sb.from('challenges').update({ goal_label: goal.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', state.challengeId).eq('user_id', state.currentUser?.id)
      dispatch({ type: 'SET_CHALLENGE', payload: { goal: goal.trim() } })
      showToast('Goal updated!')
      onClose()
    } catch (e) { showToast('Could not save. Please try again.') }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header"><div className="modal-title">Edit goal</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <label className="form-label">Saving for…</label>
        <input className="form-input" type="text" placeholder="e.g. Holiday, new car"
          value={goal} onChange={e => setGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
        <div className="modal-actions">
          <button className="btn-primary btn-full" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="btn-secondary btn-full" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
