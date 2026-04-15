import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useCreatorState } from '../../hooks/useCreatorState'
import { useToast } from '../../hooks/useToast'
import { dbCreateCustomChallenge, dbWriteEvent } from '../../services/db'
import { CURRENCIES } from '../../utils/challengeConfigs'
import StepName from './StepName'
import StepPicker from './StepPicker'
import StepAutoBuilder from './StepAutoBuilder'
import StepManualBuilder from './StepManualBuilder'
import StepPreview from './StepPreview'
import '../../styles/creator.css'

const STEP_ORDER_AUTO   = ['name', 'picker', 'auto',   'preview']
const STEP_ORDER_MANUAL = ['name', 'picker', 'manual', 'preview']

export default function CustomChallengeCreator() {
  const { state: appState, dispatch: appDispatch } = useApp()
  const { state, dispatch, reset } = useCreatorState()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const { currentUser, creatorReturnTo, challenge, activeChallenges, isPremium } = appState
  const currency  = challenge.currency || 'GBP'
  const precision = CURRENCIES?.[currency]?.decimals ?? 2

  // Log creator_opened once on mount
  useEffect(() => {
    if (currentUser) {
      dbWriteEvent(null, currentUser.id, 'creator_opened', null, null)
    }
  }, [])

  const stepOrder = state.mode === 'manual' ? STEP_ORDER_MANUAL : STEP_ORDER_AUTO
  const stepIdx   = stepOrder.indexOf(state.step)

  function goBack() {
    if (stepIdx <= 0) {
      const returnRoute = creatorReturnTo === 'setup' ? '/app/setup' : '/app/dashboard'
      navigate(returnRoute)
    } else {
      dispatch({ type: 'SET_STEP', payload: stepOrder[stepIdx - 1] })
    }
  }

  async function handleCreate() {
    if (!currentUser || state.isCreating) return
    dispatch({ type: 'SET_IS_CREATING', payload: true })

    try {
      const ch = await dbCreateCustomChallenge(
        currentUser.id,
        state.name.trim(),
        state.amounts,
        currency,
        state.spread,
        state.mode,
      )
      if (!ch) throw new Error('dbCreateCustomChallenge returned null')

      dbWriteEvent(ch.id, currentUser.id, 'creator_challenge_created', null, {
        tiles: state.amounts.length,
        total: state.amounts.reduce((s, v) => s + v, 0),
        mode:  state.mode,
      })

      const newChallenge = {
        name:           appState.challenge.name || 'there',
        goal:           state.name.trim(),
        multiplier:     1,
        challengeType:  'custom',
        currency,
        envelopes:      Array(state.amounts.length).fill(false),
        customAmounts:  state.amounts,
        doneLog:        [],
        highlightedEnv: null,
        startedAt:      ch.started_at,
      }

      ch.challenge_data = [{
        progress:     newChallenge.envelopes,
        done_log:     [],
        tile_amounts: state.amounts,
      }]

      appDispatch({ type: 'SET_CHALLENGE_ID',     payload: ch.id })
      appDispatch({ type: 'SET_CHALLENGE',         payload: newChallenge })
      appDispatch({ type: 'SET_ACTIVE_CHALLENGES', payload: [...activeChallenges, ch] })

      reset()
      navigate('/app/challenge', { replace: true })
      showToast('Your custom challenge is ready! 🎉')
    } catch (err) {
      console.error('handleCreate error:', err.message)
      dispatch({ type: 'SET_IS_CREATING', payload: false })
      showToast("Something went wrong. Tap 'Create challenge' to try again.")
    }
  }

  return (
    <div className="creator-screen">

      {/* Header with back + progress dots */}
      <div className="creator-header">
        <button className="creator-back" onClick={goBack} aria-label="Go back">
          ← Back
        </button>
        <div className="creator-progress">
          {stepOrder.map((s, i) => (
            <div
              key={s}
              className={`creator-progress-dot${i <= stepIdx ? ' active' : ''}`}
            />
          ))}
        </div>
        <div className="creator-header-title">Custom Challenge</div>
      </div>

      {/* Draft restore banner */}
      {state.hasDraft && state.step === 'name' && (
        <div style={{ padding: '12px 20px' }}>
          <div className="creator-draft-banner">
            <div className="creator-draft-text">
              You have an unfinished challenge. Continue where you left off?
            </div>
            <div className="creator-draft-actions">
              <button
                className="btn-secondary"
                style={{ fontSize: 12, padding: '6px 10px' }}
                onClick={() => reset()}
              >
                Start fresh
              </button>
              <button
                className="btn-primary"
                style={{ fontSize: 12, padding: '6px 10px' }}
                onClick={() => dispatch({ type: 'DISMISS_DRAFT' })}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Steps */}
      {state.step === 'name' && (
        <StepName
          state={state}
          dispatch={dispatch}
          onNext={() => dispatch({ type: 'SET_STEP', payload: 'picker' })}
        />
      )}

      {state.step === 'picker' && (
        <StepPicker
          state={state}
          dispatch={dispatch}
          isPremium={isPremium}
          precision={precision}
          onNext={mode => dispatch({ type: 'SET_STEP', payload: mode })}
        />
      )}

      {state.step === 'auto' && (
        <StepAutoBuilder
          state={state}
          dispatch={dispatch}
          precision={precision}
          currency={currency}
          onNext={() => dispatch({ type: 'SET_STEP', payload: 'preview' })}
        />
      )}

      {state.step === 'manual' && (
        <StepManualBuilder
          state={state}
          dispatch={dispatch}
          currency={currency}
          onNext={() => dispatch({ type: 'SET_STEP', payload: 'preview' })}
        />
      )}

      {state.step === 'preview' && (
        <StepPreview
          state={state}
          dispatch={dispatch}
          currency={currency}
          isCreating={state.isCreating}
          onEdit={() => {
            dispatch({ type: 'SET_MANUAL_INPUTS', payload: state.amounts.map(v => String(v)) })
            dispatch({ type: 'SET_MODE',          payload: 'manual' })
            dispatch({ type: 'SET_STEP',          payload: 'manual' })
          }}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
