import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import { useToast } from '../../hooks/useToast'
import { sb, signIn, signOut } from '../../services/supabase'
import { CHALLENGE_CONFIGS, CURRENCIES } from '../../utils/challengeConfigs'
import { dbCreateChallenge, dbWriteEvent, dbUpsertProfile, dbLoadActiveChallenges } from '../../services/db'
import UpgradeModal from '../modals/UpgradeModal'

// ─── Validators ───────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validateEmail(v) {
  if (!v.trim()) return 'Email is required.'
  if (!EMAIL_RE.test(v.trim())) return 'Please enter a valid email address.'
  return ''
}

function validatePassword(v) {
  if (!v) return 'Password is required.'
  if (v.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(v)) return 'Include at least one uppercase letter.'
  if (!/[0-9]/.test(v)) return 'Include at least one number.'
  return ''
}

function validateName(v) {
  if (!v.trim()) return 'First name is required.'
  if (v.trim().length < 2) return 'Name must be at least 2 characters.'
  if (v.trim().length > 50) return 'Name must be 50 characters or fewer.'
  if (!/^[a-zA-ZÀ-ÿ' -]+$/.test(v.trim())) return 'Letters, spaces, hyphens and apostrophes only.'
  return ''
}

function validateCustomMult(v) {
  const n = parseFloat(v)
  if (!v) return 'Please enter a multiplier.'
  if (isNaN(n)) return 'Must be a number.'
  if (n <= 0) return 'Must be greater than 0.'
  if (n > 1000) return 'Maximum multiplier is 1000.'
  return ''
}

// ─── Challenge presets ────────────────────────────────────────────────────────

const CHALLENGE_PRESETS = {
  envelope_100: [
    { mult: '0.5', label: '£0.50 – £50',  total: '£2,525' },
    { mult: '1',   label: '£1 – £100',    total: '£5,050' },
    { mult: '2',   label: '£2 – £200',    total: '£10,100' },
    { mult: '5',   label: '£5 – £500',    total: '£25,250' },
  ],
  week_52: [
    { mult: '1',   label: '£1 – £52',     total: '£1,378' },
    { mult: '2',   label: '£2 – £104',    total: '£2,756' },
    { mult: '5',   label: '£5 – £260',    total: '£6,890' },
    { mult: '10',  label: '£10 – £520',   total: '£13,780' },
  ],
  day_365: [
    { mult: '1',   label: '1p – £3.65',   total: '£667.95' },
    { mult: '2',   label: '2p – £7.30',   total: '£1,335.90' },
    { mult: '5',   label: '5p – £18.25',  total: '£3,339.75' },
    { mult: '10',  label: '10p – £36.50', total: '£6,679.50' },
  ],
}

const MARK_LIGHT = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMjIxMDBDIi8+PGxpbmUgeDE9IjI1IiB5MT0iMjAiIHgyPSIyNSIgeTI9IjgwIiBzdHJva2U9IiNGNUYyRUQiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxsaW5lIHgxPSI1MCIgeTE9IjIwIiB4Mj0iNTAiIHkyPSI4MCIgc3Ryb2tlPSIjRjVGMkVEIiBzdHJva2Utd2lkdGg9IjEwIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48bGluZSB4MT0iNTAiIHkxPSIyMCIgeDI9Ijc1IiB5Mj0iMjAiIHN0cm9rZT0iI0Y1RjJFRCIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTE4IDU1IFE0NSA3OCA4NSA1MCIgc3Ryb2tlPSIjRjVDODQyIiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==`

// ─── Small helpers ────────────────────────────────────────────────────────────

function FieldError({ msg }) {
  if (!msg) return null
  return <div className="auth-field-error">{msg}</div>
}

function PasswordStrength({ password }) {
  if (!password) return null
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ]
  return (
    <div className="pw-strength">
      {checks.map(c => (
        <span key={c.label} className={`pw-check${c.ok ? ' ok' : ''}`}>
          {c.ok ? '✓' : '○'} {c.label}
        </span>
      ))}
    </div>
  )
}

// ─── AuthScreen ───────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const { state, dispatch } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toggleTheme, isDark } = useTheme()
  const { showToast } = useToast()
  const panel = state.authPanel
  const isPremium = state.isPremium

  // If on /app/setup, default to the name panel
  useEffect(() => {
    if (location.pathname === '/app/setup' && panel === 'panel-auth') {
      dispatch({ type: 'SET_AUTH_PANEL', payload: 'panel-name' })
    }
  }, [location.pathname])

  // Shared auth fields
  const [authTab,       setAuthTab]       = useState('signin')   // 'signin' | 'signup'
  const [email,         setEmail]         = useState('')
  const [emailErr,      setEmailErr]      = useState('')
  const [password,      setPassword]      = useState('')
  const [passwordErr,   setPasswordErr]   = useState('')
  const [confirmPw,     setConfirmPw]     = useState('')
  const [confirmPwErr,  setConfirmPwErr]  = useState('')
  const [showPw,        setShowPw]        = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [authError,     setAuthError]     = useState('')

  // Forgot password
  const [forgotMode,    setForgotMode]    = useState(false)
  const [resetEmail,    setResetEmail]    = useState('')
  const [resetEmailErr, setResetEmailErr] = useState('')
  const [resetSent,     setResetSent]     = useState(false)
  const [resetSending,  setResetSending]  = useState(false)

  // Confirm email notice (after signup with email confirmation on)
  const [confirmEmail, setConfirmEmail] = useState('')

  // Name + goal
  const [name,     setName]     = useState('')
  const [nameErr,  setNameErr]  = useState('')
  const [goal,     setGoal]     = useState('')

  // Challenge setup
  const [challengeType, setChallengeType] = useState('envelope_100')
  const [selectedMult,  setSelectedMult]  = useState('1')
  const [customMult,    setCustomMult]    = useState('')
  const [customMultErr, setCustomMultErr] = useState('')
  const [currency,      setCurrency]      = useState('GBP')
  const [showUpgrade,   setShowUpgrade]   = useState(false)
  const [settingUp,     setSettingUp]     = useState(false)

  const emailRef    = useRef(null)
  const passwordRef = useRef(null)
  const nameRef     = useRef(null)

  function showPanel(p) { dispatch({ type: 'SET_AUTH_PANEL', payload: p }) }

  // Auto-focus
  useEffect(() => {
    if (panel === 'panel-auth')      setTimeout(() => emailRef.current?.focus(), 80)
    if (panel === 'panel-name')      setTimeout(() => nameRef.current?.focus(), 80)
  }, [panel])

  // Clear errors when switching tabs
  function switchTab(tab) {
    setAuthTab(tab)
    setEmailErr(''); setPasswordErr(''); setConfirmPwErr(''); setAuthError('')
    setForgotMode(false); setResetSent(false)
  }

  // ── Map Supabase error messages to friendly copy ──────────────────────────

  function friendlyError(msg = '') {
    const m = msg.toLowerCase()
    if (m.includes('invalid login') || m.includes('invalid credentials'))
      return 'Incorrect email or password. Please try again.'
    if (m.includes('email not confirmed'))
      return 'Please confirm your email first — check your inbox.'
    if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already'))
      return 'An account with this email already exists. Try signing in.'
    if (m.includes('rate limit') || m.includes('too many'))
      return 'Too many attempts. Please wait a moment and try again.'
    if (m.includes('weak password') || m.includes('password should'))
      return 'Password is too weak. Use at least 8 characters, one uppercase letter and one number.'
    if (m.includes('network') || m.includes('fetch'))
      return 'Network error. Check your connection and try again.'
    return msg || 'Something went wrong. Please try again.'
  }

  // ── Sign In ───────────────────────────────────────────────────────────────

  async function handleSignIn(e) {
    e.preventDefault()
    let valid = true
    const eErr = validateEmail(email)
    if (eErr) { setEmailErr(eErr); valid = false }
    if (!password) { setPasswordErr('Password is required.'); valid = false }
    if (!valid) return

    setAuthError(''); setSubmitting(true)

    // Safety net: if signIn hangs (e.g. Supabase project paused),
    // clear the submitting state after 15 s so the user isn't stuck forever.
    let timedOut = false
    const signInTimeoutId = setTimeout(() => {
      timedOut = true
      setSubmitting(false)
      setAuthError('Sign-in is taking too long. Please check your connection and try again.')
    }, 15000)

    try {
      const { data, error } = await signIn(
        email.trim().toLowerCase(),
        password,
      )
      if (timedOut) return        // timeout already showed an error
      if (error) { setAuthError(friendlyError(error.message)); return }
      if (data?.user) {
        dispatch({ type: 'SET_USER', payload: data.user })
        // Load profile + challenges, then navigate
        const profile = await dbUpsertProfile(data.user.id, {})
        dispatch({ type: 'SET_IS_PREMIUM', payload: profile?.is_pro === true })
        const challenges = await dbLoadActiveChallenges(data.user.id)
        dispatch({ type: 'SET_ACTIVE_CHALLENGES', payload: challenges })

        if (challenges.length === 0) {
          if (!profile?.name) {
            navigate('/app/setup', { replace: true })
          } else {
            dispatch({ type: 'SET_CHALLENGE', payload: { name: profile.name, currency: profile.currency || 'GBP' } })
            navigate('/app/dashboard', { replace: true })
          }
        } else {
          // Load the latest challenge data into state
          const ch  = challenges[challenges.length - 1]
          const cd  = Array.isArray(ch.challenge_data) ? ch.challenge_data[0] : (ch.challenge_data || {})
          const cfg = CHALLENGE_CONFIGS[ch.type] || CHALLENGE_CONFIGS.envelope_100
          dispatch({ type: 'SET_CHALLENGE_ID', payload: ch.id })
          dispatch({ type: 'SET_CHALLENGE', payload: {
            name: profile?.name || 'there', goal: ch.goal_label || '',
            multiplier: ch.multiplier || 1, challengeType: ch.type || 'envelope_100',
            currency: ch.currency || profile?.currency || 'GBP',
            envelopes: cd.progress || Array(cfg.slots).fill(false),
            customAmounts: cd.tile_amounts || [], doneLog: cd.done_log || [],
            highlightedEnv: null, startedAt: ch.started_at,
          }})
          navigate('/app/dashboard', { replace: true })
        }
      }
    } catch (err) {
      if (!timedOut) setAuthError(friendlyError(err.message))
    } finally {
      clearTimeout(signInTimeoutId)
      setSubmitting(false)
    }
  }

  // ── Sign Up ───────────────────────────────────────────────────────────────

  async function handleSignUp(e) {
    e.preventDefault()
    let valid = true
    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    if (eErr) { setEmailErr(eErr); valid = false }
    if (pErr) { setPasswordErr(pErr); valid = false }
    if (!confirmPw) { setConfirmPwErr('Please confirm your password.'); valid = false }
    else if (confirmPw !== password) { setConfirmPwErr('Passwords do not match.'); valid = false }
    if (!valid) return

    setAuthError(''); setSubmitting(true)
    try {
      const { data, error } = await sb.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      })

      if (error) { setAuthError(friendlyError(error.message)); return }

      // If session exists → email confirmation is OFF → user is immediately signed in
      if (data?.session) {
        dispatch({ type: 'SET_USER', payload: data.user })
        navigate('/app/setup', { replace: true })
        return
      }

      // Email confirmation is ON → show notice
      setConfirmEmail(email.trim().toLowerCase())
      showPanel('panel-confirm')
    } catch (err) {
      setAuthError(friendlyError(err.message))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  async function handleResetPassword(e) {
    e.preventDefault()
    const err = validateEmail(resetEmail)
    if (err) { setResetEmailErr(err); return }
    setResetEmailErr(''); setResetSending(true)
    try {
      const { error } = await sb.auth.resetPasswordForEmail(
        resetEmail.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/app` }
      )
      if (error) { setResetEmailErr(friendlyError(error.message)); return }
      setResetSent(true)
    } catch (err) {
      setResetEmailErr(friendlyError(err.message))
    } finally {
      setResetSending(false)
    }
  }

  // ── Name panel ────────────────────────────────────────────────────────────

  function goToChallenge() {
    const err = validateName(name)
    if (err) { setNameErr(err); nameRef.current?.focus(); return }
    setNameErr('')
    showPanel('panel-challenge')
  }

  // ── Challenge setup ───────────────────────────────────────────────────────

  function getMultiplier() {
    if (selectedMult === 'custom') return parseFloat(customMult) || 1
    return parseFloat(selectedMult) || 1
  }

  async function completeSetup() {
    if (selectedMult === 'custom') {
      const err = validateCustomMult(customMult)
      if (err) { setCustomMultErr(err); return }
      setCustomMultErr('')
    }
    const mult = getMultiplier()
    setSettingUp(true)
    try {
      let user = state.currentUser
      if (!user) {
        const { data: { session } } = await sb.auth.getSession()
        if (!session?.user) { showToast('Session expired. Please sign in again.'); showPanel('panel-auth'); return }
        user = session.user
        dispatch({ type: 'SET_USER', payload: user })
      }

      const ch = await dbCreateChallenge(user.id, name.trim(), goal.trim(), mult, challengeType, currency)
      if (!ch) { showToast('Could not create challenge. Please try again.'); return }

      const config = CHALLENGE_CONFIGS[challengeType] || CHALLENGE_CONFIGS.envelope_100
      const newChallenge = {
        name: name.trim(), goal: goal.trim(), multiplier: mult,
        challengeType, currency,
        envelopes: Array(config.slots).fill(false),
        highlightedEnv: null, startedAt: ch.started_at,
        doneLog: [{ event: 'started', goal: goal.trim() || null, ts: Date.now() }],
      }
      dispatch({ type: 'SET_CHALLENGE_ID',      payload: ch.id })
      dispatch({ type: 'SET_CHALLENGE',          payload: newChallenge })
      ch.challenge_data = [{ progress: newChallenge.envelopes, done_log: newChallenge.doneLog }]
      dispatch({ type: 'SET_ACTIVE_CHALLENGES',  payload: [...state.activeChallenges, ch] })
      dispatch({ type: 'SET_CELEBRATION',        challengeId: ch.id, payload: false })
      dispatch({ type: 'SET_MILESTONES',         challengeId: ch.id, payload: new Set() })
      dbWriteEvent(ch.id, user.id, 'challenge_started', null, { goal: goal.trim() || null })
      navigate('/app/challenge', { replace: true })
    } catch (err) {
      console.error('completeSetup:', err.message)
      showToast('Something went wrong. Please try again.')
    } finally {
      setSettingUp(false)
    }
  }

  // Determine which panel to show based on route
  const isSetupRoute = location.pathname === '/app/setup'

  const presets = CHALLENGE_PRESETS[challengeType] || CHALLENGE_PRESETS.envelope_100

  return (
    <div className="screen screen-auth active">
      <div className="auth-wrap">

        {/* Theme toggle */}
        <div className="auth-top-bar">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme"
            dangerouslySetInnerHTML={{ __html: isDark
              ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
              : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
            }}
          />
        </div>

        {/* Brand */}
        <div className="auth-brand">
          <div className="brand-mark">
            <img src={MARK_LIGHT} alt="" style={{ width: 32, height: 32 }} />
          </div>
          <div className="brand-name">Hello<span>Finity</span></div>
          <div className="brand-tag">Your savings challenges, sorted.</div>
        </div>

        {/* ── Panel: Auth (Sign In / Sign Up) ─────────────────────────────── */}
        {panel === 'panel-auth' && (
          <div className="auth-panel active">
            <div className="auth-card">

              {/* Tabs */}
              <div className="auth-tabs">
                <button
                  className={`auth-tab${authTab === 'signin' ? ' active' : ''}`}
                  onClick={() => switchTab('signin')}
                >Sign in</button>
                <button
                  className={`auth-tab${authTab === 'signup' ? ' active' : ''}`}
                  onClick={() => switchTab('signup')}
                >Create account</button>
              </div>

              {/* ── Forgot password mode ── */}
              {forgotMode ? (
                <div className="forgot-wrap">
                  {resetSent ? (
                    <>
                      <div className="auth-sent-icon">📬</div>
                      <div className="auth-intro" style={{ fontSize: 15 }}>Check your inbox.</div>
                      <div className="auth-intro-sub">
                        We sent a password reset link to <strong>{resetEmail}</strong>.
                        It expires in 1 hour.
                      </div>
                      <button className="btn-secondary btn-full" onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail('') }}>
                        ← Back to sign in
                      </button>
                    </>
                  ) : (
                    <form onSubmit={handleResetPassword}>
                      <div className="auth-intro" style={{ fontSize: 15, marginBottom: 4 }}>Reset your password</div>
                      <div className="auth-intro-sub">
                        Enter your email and we'll send a reset link.
                      </div>
                      <label className="form-label">Email address</label>
                      <input
                        className={`form-input${resetEmailErr ? ' input-error' : ''}`}
                        type="email" placeholder="you@example.com"
                        autoFocus autoComplete="email"
                        value={resetEmail}
                        onChange={e => { setResetEmail(e.target.value); setResetEmailErr('') }}
                      />
                      <FieldError msg={resetEmailErr} />
                      <button type="submit" className="btn-primary btn-full" disabled={resetSending}>
                        {resetSending ? 'Sending…' : 'Send reset link →'}
                      </button>
                      <button type="button" className="btn-secondary btn-full" style={{ marginTop: 8 }}
                        onClick={() => { setForgotMode(false); setResetEmail(''); setResetEmailErr('') }}>
                        ← Back to sign in
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <>
                  {/* ── Sign In form ── */}
                  {authTab === 'signin' && (
                    <form onSubmit={handleSignIn} noValidate>
                      <label className="form-label">Email address</label>
                      <input
                        ref={emailRef}
                        className={`form-input${emailErr ? ' input-error' : ''}`}
                        type="email" placeholder="you@example.com"
                        autoComplete="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setEmailErr(''); setAuthError('') }}
                        onKeyDown={e => e.key === 'Enter' && passwordRef.current?.focus()}
                      />
                      <FieldError msg={emailErr} />

                      <label className="form-label">Password</label>
                      <div className="pw-input-wrap">
                        <input
                          ref={passwordRef}
                          className={`form-input${passwordErr ? ' input-error' : ''}`}
                          type={showPw ? 'text' : 'password'}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          value={password}
                          onChange={e => { setPassword(e.target.value); setPasswordErr(''); setAuthError('') }}
                        />
                        <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}
                          tabIndex={-1} title={showPw ? 'Hide password' : 'Show password'}>
                          {showPw ? '🙈' : '👁️'}
                        </button>
                      </div>
                      <FieldError msg={passwordErr} />

                      {authError && <div className="auth-error-banner">{authError}</div>}

                      <button type="submit" className="btn-primary btn-full" style={{ marginTop: '0.5rem' }} disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign in →'}
                      </button>

                      <button type="button" className="forgot-link"
                        onClick={() => { setForgotMode(true); setResetEmail(email); setResetEmailErr('') }}>
                        Forgot your password?
                      </button>
                    </form>
                  )}

                  {/* ── Sign Up form ── */}
                  {authTab === 'signup' && (
                    <form onSubmit={handleSignUp} noValidate>
                      <label className="form-label">Email address</label>
                      <input
                        ref={emailRef}
                        className={`form-input${emailErr ? ' input-error' : ''}`}
                        type="email" placeholder="you@example.com"
                        autoComplete="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setEmailErr(''); setAuthError('') }}
                      />
                      <FieldError msg={emailErr} />

                      <label className="form-label">Password</label>
                      <div className="pw-input-wrap">
                        <input
                          className={`form-input${passwordErr ? ' input-error' : ''}`}
                          type={showPw ? 'text' : 'password'}
                          placeholder="Create a password"
                          autoComplete="new-password"
                          value={password}
                          onChange={e => { setPassword(e.target.value); setPasswordErr(''); setAuthError('') }}
                        />
                        <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}
                          tabIndex={-1} title={showPw ? 'Hide' : 'Show'}>
                          {showPw ? '🙈' : '👁️'}
                        </button>
                      </div>
                      <PasswordStrength password={password} />
                      <FieldError msg={passwordErr} />

                      <label className="form-label">Confirm password</label>
                      <input
                        className={`form-input${confirmPwErr ? ' input-error' : ''}`}
                        type={showPw ? 'text' : 'password'}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        value={confirmPw}
                        onChange={e => { setConfirmPw(e.target.value); setConfirmPwErr(''); setAuthError('') }}
                      />
                      <FieldError msg={confirmPwErr} />

                      {authError && <div className="auth-error-banner">{authError}</div>}

                      <button type="submit" className="btn-primary btn-full" style={{ marginTop: '0.5rem' }} disabled={submitting}>
                        {submitting ? 'Creating account…' : 'Create account →'}
                      </button>
                    </form>
                  )}

                  <p className="auth-footer-note">
                    By continuing you agree to our{' '}
                    <a href="/app/privacy" onClick={e => { e.preventDefault(); navigate('/app/privacy') }}>Privacy Policy</a>
                    {' '}and{' '}
                    <a href="/app/terms" onClick={e => { e.preventDefault(); navigate('/app/terms') }}>Terms</a>.
                  </p>
                </>
              )}

            </div>
          </div>
        )}

        {/* ── Panel: Confirm email ─────────────────────────────────────────── */}
        {panel === 'panel-confirm' && (
          <div className="auth-panel active">
            <div className="auth-card">
              <div className="auth-sent-icon">📬</div>
              <div className="auth-intro">Confirm your email.</div>
              <div className="auth-intro-sub">
                We sent a confirmation link to <strong>{confirmEmail}</strong>.
                Click it to activate your account, then come back here to sign in.
              </div>
              <div className="auth-sent-tips">
                <div className="ast-item">✓ Check your spam or junk folder</div>
                <div className="ast-item">✓ The link expires in 24 hours</div>
                <div className="ast-item">✓ Only needed once</div>
              </div>
              <button className="btn-secondary btn-full"
                onClick={() => { showPanel('panel-auth'); switchTab('signin') }}>
                ← Back to sign in
              </button>
            </div>
          </div>
        )}

        {/* ── Panel: Name ──────────────────────────────────────────────────── */}
        {panel === 'panel-name' && (
          <div className="auth-panel active">
            <div className="auth-card">
              <div className="auth-intro">Welcome! What's your name?</div>
              <div className="auth-intro-sub">Just your first name — we'll personalise your experience.</div>

              <label className="form-label">First name <span className="form-required">*</span></label>
              <input
                ref={nameRef}
                className={`form-input${nameErr ? ' input-error' : ''}`}
                type="text" placeholder="e.g. Sarah"
                autoComplete="given-name"
                value={name}
                onChange={e => { setName(e.target.value); setNameErr('') }}
                onKeyDown={e => e.key === 'Enter' && goToChallenge()}
              />
              <FieldError msg={nameErr} />

              <label className="form-label" style={{ marginTop: '1.25rem' }}>
                Saving for… <span className="form-optional">(optional)</span>
              </label>
              <input
                className="form-input"
                type="text" placeholder="e.g. Holiday, new car, rainy day fund"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && goToChallenge()}
              />
              <div className="form-hint">You can update this anytime.</div>

              <button className="btn-primary btn-full" style={{ marginTop: '1.5rem' }} onClick={goToChallenge}>
                Choose my challenge →
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  className="forgot-link"
                  onClick={() => signOut()}
                  style={{ fontSize: 12 }}
                >
                  Not you? Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Panel: Challenge Setup ───────────────────────────────────────── */}
        {panel === 'panel-challenge' && (
          <div className="auth-panel active">
            <div className="auth-card">
              <div className="auth-intro">Pick your challenge.</div>
              <div className="auth-intro-sub">Choose a type and how much you want to save in total.</div>

              <div className="form-label" style={{ marginBottom: 10 }}>Challenge type</div>
              <div className="challenge-type-grid">
                {[
                  { type: 'envelope_100', icon: '✉️', name: '100 Envelopes', desc: '£1–£100 each' },
                  { type: 'week_52',      icon: '📅', name: '52 Weeks',      desc: '£1–£52 weekly' },
                  { type: 'day_365',      icon: '☀️', name: '365 Days',      desc: '1p–£3.65 daily' },
                ].map(c => (
                  <button key={c.type}
                    className={`challenge-type-option${challengeType === c.type ? ' selected' : ''}`}
                    onClick={() => { setChallengeType(c.type); setSelectedMult('1') }}>
                    <div className="cto-icon">{c.icon}</div>
                    <div className="cto-name">{c.name}</div>
                    <div className="cto-desc">{c.desc}</div>
                  </button>
                ))}
                {/* Custom challenge card */}
                <button
                  className={`challenge-type-option${!isPremium ? ' locked' : ''}`}
                  onClick={() => {
                    if (!isPremium) {
                      setShowUpgrade(true)
                    } else {
                      dispatch({ type: 'SET_CREATOR_RETURN_TO', payload: 'setup' })
                      navigate('/app/custom-creator')
                    }
                  }}
                >
                  <div className="cto-icon">✨</div>
                  <div className="cto-name">Custom</div>
                  <div className="cto-desc">{isPremium ? 'Build your own' : '🔒 Pro'}</div>
                </button>
              </div>

              <div className="form-label" style={{ marginTop: '1.25rem', marginBottom: 10 }}>Multiplier</div>
              <div className="amount-grid">
                {presets.map(p => (
                  <button key={p.mult}
                    className={`amount-option${selectedMult === p.mult ? ' selected' : ''}`}
                    onClick={() => { setSelectedMult(p.mult); setCustomMultErr('') }}>
                    <div>{p.label}</div>
                    <div className="ao-total">Total: {p.total}</div>
                  </button>
                ))}
                <button className={`amount-option${selectedMult === 'custom' ? ' selected' : ''}`}
                  onClick={() => setSelectedMult('custom')}>
                  <div>Custom</div>
                  <div className="ao-total">Enter below</div>
                </button>
              </div>

              {selectedMult === 'custom' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <label className="form-label">Custom multiplier</label>
                  <input
                    className={`form-input${customMultErr ? ' input-error' : ''}`}
                    type="number" min="0.01" step="0.01" placeholder="e.g. 1.5"
                    value={customMult}
                    onChange={e => { setCustomMult(e.target.value); setCustomMultErr('') }}
                  />
                  <FieldError msg={customMultErr} />
                </div>
              )}

              <div className="form-label" style={{ marginTop: '1.25rem', marginBottom: 10 }}>Currency</div>
              <div className="currency-grid">
                {Object.entries(CURRENCIES).map(([code, cur]) => (
                  <button key={code}
                    className={`currency-option${currency === code ? ' selected' : ''}`}
                    onClick={() => setCurrency(code)}>
                    {cur.symbol} {code}
                  </button>
                ))}
              </div>

              <button className="btn-primary btn-full" style={{ marginTop: '1.5rem' }}
                onClick={completeSetup} disabled={settingUp}>
                {settingUp ? 'Setting up…' : 'Start my challenge →'}
              </button>
              <button className="btn-secondary btn-full" style={{ marginTop: 8 }}
                onClick={() => showPanel('panel-name')}>
                ← Back
              </button>
            </div>
          </div>
        )}

      </div>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} onUpgraded={() => { setShowUpgrade(false); dispatch({ type: 'SET_CREATOR_RETURN_TO', payload: 'setup' }); navigate('/app/custom-creator') }} />}
    </div>
  )
}
