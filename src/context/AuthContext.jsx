import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { sb, signOutState, signInState } from '../services/supabase'

const AuthContext = createContext(null)

/**
 * AuthProvider — manages Supabase session independently of app state.
 *
 * The session is resolved once on mount via getSession() (synchronous read
 * from localStorage) so that a page refresh on a protected route doesn't
 * flash the login screen.
 *
 * The onAuthStateChange listener updates the user/session reactively, but
 * spurious SIGNED_OUT events are suppressed unless signOutState.intentional
 * was set (i.e. the user actively clicked "Sign out").
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const suppressSignOut       = useRef(false)

  useEffect(() => {
    // 1. Synchronous session from cache (localStorage)
    sb.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user) {
        setUser(s.user)
        setSession(s)
        suppressSignOut.current = true // suppress any immediate spurious SIGNED_OUT
      }
      setLoading(false)
    })

    // 2. Reactive listener
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') {
        if (s?.user) {
          setUser(s.user)
          setSession(s)
          suppressSignOut.current = true
          setLoading(false)
        }
        
        if (event === 'PASSWORD_RECOVERY') {
          // Set a temporary session flag or signal that we are in recovery mode
          window.__recoveryMode = true
        }
        return
      }

      if (event === 'SIGNED_OUT') {
        const intentional = signOutState.intentional
        signOutState.intentional = false

        // If it was intentional, always honour it
        if (intentional) {
          setUser(null)
          setSession(null)
          setLoading(false)
          return
        }

        // If we currently have a user and sign-in isn't in progress,
        // this is a spurious SIGNED_OUT from Supabase's async validation.
        // Suppress it.
        if (suppressSignOut.current || signInState.inProgress) {
          // Suppress once, then clear the flag after a grace period.
          // Multiple spurious events can arrive within a few seconds.
          setTimeout(() => { suppressSignOut.current = false }, 10000)
          return
        }

        // Genuine sign-out
        setUser(null)
        setSession(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, setUser, setSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
