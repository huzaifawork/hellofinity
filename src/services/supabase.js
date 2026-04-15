import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    'Missing Supabase credentials. ' +
    'Copy .env.example → .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * Intentional sign-out wrapper.
 *
 * All sign-out buttons must call this instead of sb.auth.signOut() directly.
 * It sets a flag so the AuthContext listener can distinguish explicit
 * sign-outs from the spurious SIGNED_OUT that Supabase fires when its
 * background /auth/v1/user validation returns 401.
 */
export const signOutState = { intentional: false }

export async function signOut() {
  signOutState.intentional = true
  await sb.auth.signOut()
  // Navigate to login page after sign-out
  window.location.href = '/app/login'
}

/**
 * Sign-in wrapper.
 *
 * Sets signInState.inProgress = true so the AuthContext SIGNED_OUT handler
 * can suppress the SIGNED_OUT that Supabase fires for the previous session
 * just before emitting SIGNED_IN with the new session.
 */
export const signInState = { inProgress: false }

export async function signIn(email, password) {
  signInState.inProgress = true
  try {
    const result = await sb.auth.signInWithPassword({ email, password })
    // Keep flag active briefly — the SIGNED_OUT for the old session can arrive
    // a few hundred ms after signInWithPassword resolves.
    setTimeout(() => { signInState.inProgress = false }, 2000)
    return result
  } catch (err) {
    signInState.inProgress = false
    throw err
  }
}
