import { validateName } from '../../utils/creatorValidation'

export default function StepName({ state, dispatch, onNext }) {
  const validation = validateName(state.name)

  return (
    <div className="creator-body">
      <div className="creator-title">Name your challenge.</div>
      <div className="creator-subtitle">
        This appears on your dashboard and progress cards.
      </div>

      <label className="form-label">Challenge name</label>
      <input
        className="form-input"
        type="text"
        placeholder="e.g. Holiday Fund, New Car, Rainy Day"
        autoFocus
        maxLength={60}
        autoComplete="off"
        value={state.name}
        onChange={e => dispatch({ type: 'SET_NAME', payload: e.target.value })}
        onKeyDown={e => e.key === 'Enter' && validation.valid && onNext()}
      />
      {state.name && !validation.valid && (
        <div className="creator-hint-error">{validation.message}</div>
      )}

      <div className="creator-footer">
        <button
          className="btn-primary btn-full"
          onClick={onNext}
          disabled={!validation.valid}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
