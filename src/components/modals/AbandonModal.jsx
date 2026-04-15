import { useApp } from '../../context/AppContext'
import { useToast } from '../../hooks/useToast'
import { sb } from '../../services/supabase'

export default function AbandonModal({ onClose, onConfirm }) {
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">Start a new challenge?</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1rem' }}>
          Your current challenge will be archived. You can still view it in your dashboard history.
        </p>
        <div className="modal-actions">
          <button className="btn-primary btn-full" onClick={onConfirm}>
            Yes, archive &amp; start new
          </button>
          <button className="btn-secondary btn-full" onClick={onClose}>Keep current challenge</button>
        </div>
      </div>
    </div>
  )
}
