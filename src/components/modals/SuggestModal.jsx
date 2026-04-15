import { useState } from 'react'
import { useToast } from '../../hooks/useToast'
import { dbSubmitSuggestion } from '../../services/db'

export default function SuggestModal({ onClose, currentUser }) {
  const { showToast } = useToast()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (!text.trim()) { showToast('Write something first! 😊'); return }
    setSending(true)
    try {
      await dbSubmitSuggestion(currentUser?.id, text.trim())
      setText(''); onClose(); showToast('Thanks! We read every single one. 🙏')
    } catch { showToast("Couldn't send. Please try again.") }
    finally { setSending(false) }
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header"><div className="modal-title">Send a suggestion</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <label className="form-label">Your idea or feedback</label>
        <textarea className="form-textarea" rows={4} placeholder="I'd love it if…" value={text} onChange={e => setText(e.target.value)} />
        <div className="modal-actions">
          <button className="btn-primary btn-full" onClick={submit} disabled={sending}>{sending ? 'Sending…' : 'Send suggestion →'}</button>
          <button className="btn-secondary btn-full" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
