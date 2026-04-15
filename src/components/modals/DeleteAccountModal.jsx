import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../../hooks/useToast'
import { sb, signOut } from '../../services/supabase'

export default function DeleteAccountModal({ onClose }) {
  const { state, dispatch } = useApp()
  const { showToast } = useToast()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const canDelete = confirmText.trim().toUpperCase() === 'DELETE'

  async function confirmDelete() {
    if (!canDelete) { showToast('Type DELETE to confirm.'); return }
    setDeleting(true)
    try {
      const userId = state.currentUser?.id
      if (!userId) throw new Error('Not signed in')

      await sb.from('challenge_events').delete().eq('user_id', userId)
      const { data: challenges } = await sb.from('challenges').select('id').eq('user_id', userId)
      if (challenges?.length) {
        await sb.from('challenge_data').delete().in('challenge_id', challenges.map(r => r.id))
      }
      await sb.from('challenges').delete().eq('user_id', userId)
      await sb.from('profiles').delete().eq('id', userId)
      await sb.from('deletions_log').insert({
        user_id: userId,
        email: state.currentUser?.email,
        deleted_at: new Date().toISOString(),
      }).then(() => {})

      await signOut()
      dispatch({ type: 'SET_USER', payload: null })
      onClose()
      showToast('Your account has been deleted.')
    } catch (e) {
      showToast('Something went wrong. Please try again or email hello@hellofinity.com')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">Delete account</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1rem' }}>
          This will permanently delete your account and all your challenge data. This cannot be undone.
        </p>
        <label className="form-label">Type <strong>DELETE</strong> to confirm</label>
        <input
          className="form-input"
          type="text"
          placeholder="DELETE"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn-primary btn-full btn-danger" onClick={confirmDelete} disabled={!canDelete || deleting}>
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
          <button className="btn-secondary btn-full" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
