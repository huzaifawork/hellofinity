import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useToast } from '../../hooks/useToast'

export default function TargetDateModal({ onClose }) {
  const { state } = useApp()
  const { showToast } = useToast()
  const [date, setDate] = useState('')

  function save() {
    if (!date) { showToast('Pick a date first.'); return }
    localStorage.setItem(`hf-target-${state.challengeId}`, date)
    showToast('Target date saved!')
    onClose()
  }
  function remove() {
    localStorage.removeItem(`hf-target-${state.challengeId}`)
    showToast('Target date removed.')
    onClose()
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header"><div className="modal-title">Target end date</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <label className="form-label">I want to finish by</label>
        <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <div className="modal-actions">
          <button className="btn-primary btn-full" onClick={save}>Save</button>
          <button className="btn-secondary btn-full" onClick={remove}>Remove target date</button>
          <button className="btn-secondary btn-full" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
