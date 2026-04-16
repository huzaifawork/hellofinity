import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { dbLoadActiveChallenges, dbUpsertProfile } from '../services/db'
import { CHALLENGE_CONFIGS } from '../utils/challengeConfigs'
import '../styles/app.css'

import Toast from '../components/common/Toast'
import MilestoneBanner from '../components/common/MilestoneBanner'

/**
 * AppLayout — wraps all /app/* routes.
 *
 * Responsibilities:
 *  1. Load the user's profile + challenges from DB on mount (and when user changes)
 *  2. Apply theme
 *  3. Provide shared UI (Toast, MilestoneBanner)
 *  4. Redirect to the correct sub-route based on data state
 *
 * It does NOT manage auth — that's handled by AuthContext + ProtectedRoute.
 */
export default function AppLayout() {
  const { state, dispatch } = useApp()
  const { user } = useAuth()
  const { theme } = useTheme()
  const navigate  = useNavigate()
  const location  = useLocation()

  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('hf-theme') || 'light'
    dispatch({ type: 'SET_THEME', payload: saved })
  }, [])

  // Load user data when user is available
  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function loadUserData() {
      dispatch({ type: 'SET_USER', payload: user })

      try {
        // 1. Sync profile
        const profile = await dbUpsertProfile(user.id, {})
        if (cancelled) return
        dispatch({ type: 'SET_IS_PREMIUM', payload: profile?.is_pro === true })

        // 2. Load active challenges
        const challenges = await dbLoadActiveChallenges(user.id)
        if (cancelled) return
        dispatch({ type: 'SET_ACTIVE_CHALLENGES', payload: challenges })

        // 3. No challenges yet — route accordingly
        if (challenges.length === 0) {
          if (profile === null) {
            // Profile fetch failed — stay on current page (login will be shown by ProtectedRoute)
            return
          }
          if (!profile.name) {
            // New user — needs name setup (but only redirect if on /app/login or /app exactly)
            if (location.pathname === '/app/login' || location.pathname === '/app' || location.pathname === '/app/') {
              navigate('/app/setup', { replace: true })
            }
            return
          }
          // User has profile but no challenges — go to dashboard
          dispatch({ type: 'SET_CHALLENGE', payload: {
            name:     profile.name,
            currency: profile.currency || 'GBP',
          }})
          if (location.pathname === '/app/login' || location.pathname === '/app' || location.pathname === '/app/') {
            navigate('/app/dashboard', { replace: true })
          }
          return
        }

        // 4. Load most recent challenge
        const ch  = challenges[challenges.length - 1]
        const cd  = Array.isArray(ch.challenge_data) ? ch.challenge_data[0] : (ch.challenge_data || {})
        const cfg = CHALLENGE_CONFIGS[ch.type] || CHALLENGE_CONFIGS.envelope_100

        dispatch({ type: 'SET_CHALLENGE_ID', payload: ch.id })
        dispatch({
          type: 'SET_CHALLENGE',
          payload: {
            name: profile?.name || 'there',
            goal: ch.goal_label || '',
            multiplier: ch.multiplier || 1,
            challengeType: ch.type || 'envelope_100',
            currency: ch.currency || profile?.currency || 'GBP',
            envelopes: cd.progress || Array(cfg.slots).fill(false),
            customAmounts: cd.tile_amounts || [],
            doneLog: cd.done_log || [],
            highlightedEnv: null,
            startedAt: ch.started_at,
          },
        })

        // 5. Init milestones per challenge
        challenges.forEach(ach => {
          const acd  = Array.isArray(ach.challenge_data) ? ach.challenge_data[0] : (ach.challenge_data || {})
          const acfg = CHALLENGE_CONFIGS[ach.type] || CHALLENGE_CONFIGS.envelope_100
          const done = (acd.progress || []).filter(Boolean).length
          const totalSlots = ach.type === 'custom' ? (acd.tile_amounts?.length || 0) : acfg.slots
          dispatch({ type: 'SET_CELEBRATION', challengeId: ach.id, payload: totalSlots > 0 && done === totalSlots })
          dispatch({ type: 'SET_MILESTONES',  challengeId: ach.id, payload: new Set() })
        })

        // 6. Redirect to dashboard if on login/root
        if (location.pathname === '/app/login' || location.pathname === '/app' || location.pathname === '/app/') {
          navigate('/app/dashboard', { replace: true })
        }
      } catch (e) {
        console.error('loadUserData error:', e.message)
      }
    }

    loadUserData()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <div data-theme={theme}>
      <Toast />
      <MilestoneBanner />
      <Outlet />
    </div>
  )
}
