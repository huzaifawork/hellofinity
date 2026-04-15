import { useReducer, useEffect, useCallback } from 'react'

const DRAFT_VERSION = 1
const STORAGE_KEY   = 'hf-creator-draft'

export const initialCreatorState = {
  step:         'name',   // 'name' | 'picker' | 'auto' | 'manual' | 'preview'
  mode:         null,     // 'auto' | 'manual' | null

  name:         '',

  // Auto mode — dual representation keeps strings in UI, numbers in logic
  tilesInput:   '',       // raw string (what the input shows)
  targetInput:  '',       // raw string
  tiles:        null,     // validated number | null
  target:       null,     // validated number | null
  spread:       'equal',  // 'equal' | 'ascending' | 'descending' | 'random'

  // Single source of truth for tile values
  amounts:      [],       // number[] — committed valid values
  baseAmounts:  [],       // number[] — ascending-sorted; source for reshuffle; never mutated

  // Manual mode
  manualInputs:     [],   // string[] — editing state (may be invalid)
  previousAmounts:  [],   // number[] — one-level undo snapshot

  // Draft persistence metadata
  isDraft:      false,
  lastUpdated:  null,
  version:      DRAFT_VERSION,

  // Async state
  isCreating:   false,

  // Internal: draft banner
  hasDraft:     false,
}

function creatorReducer(state, action) {
  switch (action.type) {

    case 'SET_STEP':
      return { ...state, step: action.payload }

    case 'SET_MODE':
      return { ...state, mode: action.payload, isDraft: true }

    case 'SET_NAME':
      return { ...state, name: action.payload, isDraft: action.payload.length > 0 }

    case 'SET_TILES_INPUT': {
      const n = parseInt(action.payload, 10)
      const valid = !isNaN(n) && Number.isInteger(n) && n >= 2
      return { ...state, tilesInput: action.payload, tiles: valid ? n : null }
    }

    case 'SET_TARGET_INPUT': {
      const n = parseFloat(action.payload)
      return { ...state, targetInput: action.payload, target: (!isNaN(n) && n > 0) ? n : null }
    }

    case 'SET_SPREAD':
      return { ...state, spread: action.payload }

    case 'SET_AMOUNTS':
      return { ...state, amounts: action.payload, isDraft: true, lastUpdated: Date.now() }

    case 'SET_BASE_AMOUNTS':
      return { ...state, baseAmounts: action.payload }

    case 'SET_MANUAL_INPUTS':
      return { ...state, manualInputs: action.payload, isDraft: true }

    case 'UPDATE_MANUAL_INPUT': {
      const next = [...state.manualInputs]
      next[action.index] = action.value
      return { ...state, manualInputs: next, isDraft: true }
    }

    case 'ADD_MANUAL_TILE':
      return { ...state, manualInputs: [...state.manualInputs, ''], isDraft: true }

    case 'REMOVE_MANUAL_TILE': {
      const next = state.manualInputs.filter((_, i) => i !== action.index)
      return { ...state, manualInputs: next, isDraft: true }
    }

    case 'COMMIT_MANUAL_AMOUNTS': {
      return {
        ...state,
        previousAmounts: state.amounts,
        amounts: action.payload,
        lastUpdated: Date.now(),
      }
    }

    case 'UNDO':
      return { ...state, amounts: state.previousAmounts, previousAmounts: [] }

    case 'PASTE_AMOUNTS': {
      // action.payload is already a parsed number[] from parsePaste()
      const inputs = action.payload.map(v => String(v))
      return { ...state, manualInputs: inputs, isDraft: true }
    }

    case 'APPLY_TEMPLATE':
      return {
        ...state,
        name:        action.name,
        tilesInput:  String(action.tiles),
        targetInput: String(action.target),
        tiles:       action.tiles,
        target:      action.target,
        spread:      action.spread,
        mode:        'auto',
        isDraft:     true,
      }

    case 'SET_IS_CREATING':
      return { ...state, isCreating: action.payload }

    case 'DISMISS_DRAFT':
      return { ...state, hasDraft: false }

    case 'RESET':
      return { ...initialCreatorState }

    default:
      return state
  }
}

function isValidDraft(draft) {
  return (
    draft != null &&
    draft.version === DRAFT_VERSION &&
    typeof draft.name === 'string' &&
    Array.isArray(draft.amounts)
  )
}

export function useCreatorState() {
  const [state, dispatch] = useReducer(
    creatorReducer,
    initialCreatorState,
    (init) => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (isValidDraft(parsed)) {
            return { ...init, ...parsed, isCreating: false, hasDraft: true }
          }
        }
      } catch (_) {
        // Corrupt draft — discard silently
        sessionStorage.removeItem(STORAGE_KEY)
      }
      return { ...init, hasDraft: false }
    }
  )

  // Persist draft on every state change — debounced 500ms
  useEffect(() => {
    if (!state.isDraft) return
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch (_) {}
    }, 500)
    return () => clearTimeout(timer)
  }, [state])

  const reset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    dispatch({ type: 'RESET' })
  }, [])

  return { state, dispatch, reset }
}
