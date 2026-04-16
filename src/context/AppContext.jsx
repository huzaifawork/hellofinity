import { createContext, useContext, useReducer, useRef } from 'react'
import { CHALLENGE_CONFIGS } from '../utils/challengeConfigs'

const AppContext = createContext(null)

const initialState = {
  // Auth
  currentUser: null,
  isPremium:   false,          // loaded from profile.is_pro on login
  // Challenge
  challengeId: null,
  activeChallenges: [],
  challenge: {
    name: '',
    goal: '',
    multiplier: 1,
    challengeType: 'envelope_100',
    currency: 'GBP',
    envelopes: Array(100).fill(false),
    customAmounts: [],         // number[] for custom challenge tile values
    doneLog: [],
    highlightedEnv: null,
    startedAt: null,
    updatedAt: null,
  },
  // UI
  screen: 'loading',          // loading | auth | app | dashboard
  authPanel: 'panel-auth',    // panel-auth | panel-confirm | panel-name | panel-challenge
  creatorReturnTo: null,       // 'auth' | 'dashboard' — where to return after creator
  theme: localStorage.getItem('hf-theme') || 'light',
  // Milestones: Map challengeId → Set of hit pcts
  milestonesMap: new Map(),
  celebrationMap: new Map(),
  // Toast
  toast: null,
  // Saving indicator
  savingState: 'idle', // idle | saving | saved
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':          return { ...state, currentUser: action.payload }
    case 'SET_IS_PREMIUM':        return { ...state, isPremium: action.payload }
    case 'SET_CREATOR_RETURN_TO': return { ...state, creatorReturnTo: action.payload }
    case 'SET_SCREEN':        return { ...state, screen: action.payload }
    case 'SET_AUTH_PANEL':    return { ...state, authPanel: action.payload }
    case 'SET_CHALLENGE_ID':  return { ...state, challengeId: action.payload }
    case 'SET_ACTIVE_CHALLENGES': return { ...state, activeChallenges: action.payload }
    case 'SET_CHALLENGE':     return { ...state, challenge: { ...state.challenge, ...action.payload } }
    case 'TOGGLE_ENVELOPE': {
      const envelopes = [...state.challenge.envelopes]
      envelopes[action.payload] = !envelopes[action.payload]
      return { ...state, challenge: { ...state.challenge, envelopes } }
    }
    case 'SET_THEME':         return { ...state, theme: action.payload }
    case 'SET_TOAST':         return { ...state, toast: action.payload }
    case 'SET_SAVING':        return { ...state, savingState: action.payload }
    case 'SET_MILESTONES': {
      const mm = new Map(state.milestonesMap)
      mm.set(action.challengeId, action.payload)
      return { ...state, milestonesMap: mm }
    }
    case 'SET_CELEBRATION': {
      const cm = new Map(state.celebrationMap)
      cm.set(action.challengeId, action.payload)
      return { ...state, celebrationMap: cm }
    }
    case 'RESET_CHALLENGE_DATA': {
      const config = CHALLENGE_CONFIGS[action.challengeType] || CHALLENGE_CONFIGS.envelope_100
      return {
        ...state,
        challenge: {
          name: '', goal: '',
          multiplier: 1,
          challengeType: action.challengeType || 'envelope_100',
          currency: 'GBP',
          envelopes: Array(config.slots).fill(false),
          customAmounts: [],      // reset custom amounts
          doneLog: [],
          highlightedEnv: null,
          startedAt: null,
        }
      }
    }
    default: return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const saveTimeoutRef = useRef(null)

  return (
    <AppContext.Provider value={{ state, dispatch, saveTimeoutRef }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
