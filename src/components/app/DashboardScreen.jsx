import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../hooks/useTheme'
import { fmt, totalForMult } from '../../utils/formatters'
import { CHALLENGE_CONFIGS } from '../../utils/challengeConfigs'
import { dbLoadArchivedChallenges, dbArchiveChallenge, dbDeleteChallenge } from '../../services/db'
import { sb, signOut } from '../../services/supabase'
import HelpModal from '../modals/HelpModal'
import SuggestModal from '../modals/SuggestModal'
import DeleteAccountModal from '../modals/DeleteAccountModal'
import ChangeCurrencyModal from '../modals/ChangeCurrencyModal'
import UpgradeModal from '../modals/UpgradeModal'

const MARK = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMjIxMDBDIi8+PGxpbmUgeDE9IjI1IiB5MT0iMjAiIHgyPSIyNSIgeTI9IjgwIiBzdHJva2U9IiNGNUYyRUQiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxsaW5lIHgxPSI1MCIgeTE9IjIwIiB4Mj0iNTAiIHkyPSI4MCIgc3Ryb2tlPSIjRjVGMkVEIiBzdHJva2Utd2lkdGg9IjEwIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48bGluZSB4MT0iNTAiIHkxPSIyMCIgeDI9Ijc1IiB5Mj0iMjAiIHN0cm9rZT0iI0Y1RjJFRCIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTE4IDU1IFE0NSA3OCA4NSA1MCIgc3Ryb2tlPSIjRjVDODQyIiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==`

export default function DashboardScreen({ visible }) {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const { challenge, currentUser, activeChallenges, challengeId, isPremium, creatorReturnTo } = state
  const { theme, toggleTheme, isDark } = useTheme()
  const [archived, setArchived] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [showChangeCurrency, setShowChangeCurrency] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    if (!visible || !currentUser) return
    dbLoadArchivedChallenges(currentUser.id).then(setArchived)
  }, [visible, currentUser])

  if (!visible) return null

  const hour = new Date().getHours()
  const timeGreet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const greeting = challenge.name && challenge.name !== 'there' ? `${timeGreet}, ${challenge.name} 👋` : 'Welcome back 👋'

  const totalSaved = activeChallenges.reduce((sum, ch) => {
    const cfg  = CHALLENGE_CONFIGS[ch.type] || CHALLENGE_CONFIGS.envelope_100
    const data = Array.isArray(ch.challenge_data) ? ch.challenge_data[0] : (ch.challenge_data || {})
    const prog = data.progress || []
    if (ch.type === 'custom') {
      const tileAmounts = data.tile_amounts || []
      return sum + prog.reduce((s, v, i) => v ? s + (tileAmounts[i] ?? 0) : s, 0)
    }
    return sum + prog.reduce((s, v, i) => v ? s + cfg.slotValue(i, ch.multiplier || 1) : s, 0)
  }, 0) + archived.reduce((sum, ch) => {
    const cfg  = CHALLENGE_CONFIGS[ch.type] || CHALLENGE_CONFIGS.envelope_100
    const data = Array.isArray(ch.challenge_data) ? ch.challenge_data[0] : (ch.challenge_data || {})
    const prog = data.progress || []
    if (ch.type === 'custom') {
      const tileAmounts = data.tile_amounts || []
      if (!prog.length) return sum
      return sum + prog.reduce((s, v, i) => v ? s + (tileAmounts[i] ?? 0) : s, 0)
    }
    if (!prog.length) return sum + totalForMult(ch.multiplier || 1, ch.type)
    return sum + prog.reduce((s, v, i) => v ? s + cfg.slotValue(i, ch.multiplier || 1) : s, 0)
  }, 0)

  function openChallenge(ch) {
    const cfg = CHALLENGE_CONFIGS[ch.type] || CHALLENGE_CONFIGS.envelope_100
    const cd  = Array.isArray(ch.challenge_data) ? ch.challenge_data[0] : (ch.challenge_data || {})
    dispatch({ type: 'SET_CHALLENGE_ID', payload: ch.id })
    dispatch({ type: 'SET_CHALLENGE', payload: {
      name:          challenge.name,
      goal:          ch.goal_label || '',
      multiplier:    ch.multiplier || 1,
      challengeType: ch.type || 'envelope_100',
      currency:      ch.currency || 'GBP',
      envelopes:     cd.progress || Array(cfg.slots).fill(false),
      customAmounts: cd.tile_amounts || [],
      doneLog:       cd.done_log || [],
      highlightedEnv: null,
      startedAt:     ch.started_at,
    }})
    navigate('/app/challenge')
  }

  async function archiveChallenge(chId) {
    if (!currentUser) return
    await dbArchiveChallenge(chId, currentUser.id)
    const updated = activeChallenges.filter(c => c.id !== chId)
    dispatch({ type: 'SET_ACTIVE_CHALLENGES', payload: updated })
    if (challengeId === chId) dispatch({ type: 'SET_CHALLENGE_ID', payload: updated[0]?.id || null })
    const newArchived = await dbLoadArchivedChallenges(currentUser.id)
    setArchived(newArchived)
  }

  async function deleteChallenge(chId) {
    if (!currentUser) return
    if (!window.confirm('Delete this challenge? This cannot be undone.')) return
    await dbDeleteChallenge(chId, currentUser.id)
    const updated = activeChallenges.filter(c => c.id !== chId)
    dispatch({ type: 'SET_ACTIVE_CHALLENGES', payload: updated })
    if (challengeId === chId) dispatch({ type: 'SET_CHALLENGE_ID', payload: updated[0]?.id || null })
  }

  return (
    <div id="screen-dashboard" className="screen active">
      {/* Header */}
      <header className="dash-header">
        <div className="header-brand">
          <div className="header-mark" style={{ width: 30, height: 30, borderRadius: 8 }}>
            <img src={MARK} alt="" style={{ width: 18, height: 18 }} />
          </div>
          <div className="header-name" style={{ fontSize: 15 }}>Hello<span>Finity</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="theme-toggle" onClick={toggleTheme}
            dangerouslySetInnerHTML={{ __html: isDark
              ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
              : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
            }}
          />
          <div style={{ position: 'relative' }}>
            <button className="header-avatar-btn" onClick={() => setMenuOpen(o => !o)} title="Account">
              <span className="header-avatar-initial">
                {(challenge.name && challenge.name !== 'there' ? challenge.name : currentUser?.email || '?')[0].toUpperCase()}
              </span>
            </button>
            {menuOpen && (
              <div className="account-menu" style={{ display: 'block' }}>
                <button onClick={() => { setMenuOpen(false); setShowHelp(true) }}>Help</button>
                <button onClick={() => { setMenuOpen(false); setShowSuggest(true) }}>Suggestions</button>
                <button onClick={() => { setMenuOpen(false); setShowChangeCurrency(true) }}>Change currency</button>
                <button onClick={() => { setMenuOpen(false); setShowDeleteAccount(true) }} className="danger">Delete account</button>
                <button onClick={() => signOut()}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="dash-content">
        {/* Greeting */}
        <div className="dash-greeting">
          <div className="dash-greeting-name">{greeting}</div>
          <div className="dash-greeting-sub">
            {activeChallenges.length > 1 ? "Here's how your challenges are looking." : "Here's how you're doing."}
          </div>
        </div>

        {/* Hero */}
        <div className="dash-hero">
          <div className="dash-hero-left">
            <div className="dash-hero-label">Total saved (all time)</div>
            <div className="dash-hero-value">{fmt(totalSaved, challenge.currency)}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-label">Active</div>
            <div className="dash-stat-value">{activeChallenges.length}</div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-label">Completed</div>
            <div className="dash-stat-value">{archived.length}</div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-label">Days in</div>
            <div className="dash-stat-value">{challenge.startedAt ? Math.max(1, Math.floor((Date.now() - new Date(challenge.startedAt).getTime()) / 86400000)) : '—'}</div>
          </div>
        </div>

        {/* Challenges list */}
        <div className="dash-section-header">
          <div className="dash-section-title">Your challenges</div>
          <button className="dash-add-btn" onClick={() => { dispatch({ type: 'SET_AUTH_PANEL', payload: 'panel-challenge' }); navigate('/app/setup') }}>+ New</button>
        </div>

        <div className="dash-challenges-list">
          {activeChallenges.map(ch => {
            const cfg = CHALLENGE_CONFIGS[ch.type] || CHALLENGE_CONFIGS.envelope_100
            const cd = Array.isArray(ch.challenge_data) ? ch.challenge_data[0] : ch.challenge_data || {}
            const prog = cd.progress || []
            const done = prog.filter(Boolean).length
            const isCustomCh = ch.type === 'custom'
            const tileAmounts = isCustomCh ? (cd.tile_amounts || []) : []
            const totalSlots = isCustomCh ? tileAmounts.length : cfg.slots
            const pct = totalSlots > 0 ? Math.round(done / totalSlots * 100) : 0
            const saved = isCustomCh
              ? prog.reduce((s, v, i) => v ? s + (tileAmounts[i] ?? 0) : s, 0)
              : prog.reduce((s, v, i) => v ? s + cfg.slotValue(i, ch.multiplier || 1) : s, 0)
            const isActive = ch.id === challengeId
            return (
              <div key={ch.id} className={`dash-challenge-card${isActive ? ' active' : ''}`} onClick={() => openChallenge(ch)}>
                <div className="dcc-top">
                  <div className="dcc-name">{ch.goal_label || cfg.label}</div>
                  <div className="dcc-pct">{pct}%</div>
                </div>
                <div className="dcc-type">{cfg.label}</div>
                <div className="dcc-progress-track"><div className="dcc-progress-fill" style={{ width: `${pct}%` }} /></div>
                <div className="dcc-meta" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{fmt(saved, ch.currency || 'GBP')} saved</span>
                  <span>{done} of {totalSlots}</span>
                </div>
                <div className="dcc-actions" onClick={e => e.stopPropagation()}>
                  <button onClick={() => archiveChallenge(ch.id)} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Archive</button>
                  <button onClick={() => deleteChallenge(ch.id)} style={{ fontSize: 11, color: 'var(--terra)', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            )
          })}

          {/* Add new card */}
          <div className="dash-challenge-card dnc" onClick={() => { dispatch({ type: 'SET_AUTH_PANEL', payload: 'panel-challenge' }); navigate('/app/setup') }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>+</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{archived.length > 0 ? 'Start another challenge' : 'Start your first challenge'}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>100 envelopes, 52 weeks, or 365 days</div>
            </div>
          </div>
        </div>

        <button
          className="btn-secondary"
          style={{ marginTop: 12, width: '100%' }}
          onClick={() => {
            if (!isPremium) {
              setShowUpgrade(true)
            } else {
              dispatch({ type: 'SET_CREATOR_RETURN_TO', payload: 'dashboard' })
              navigate('/app/custom-creator')
            }
          }}
        >
          + Custom challenge
        </button>

        {/* Archived */}
        {archived.length > 0 && (
          <>
            <div className="dash-section-header" style={{ marginTop: '1.75rem' }}>
              <div className="dash-section-title">Completed challenges</div>
            </div>
            <div className="dash-history-list">
              {archived.map(ch => {
                const cfg = CHALLENGE_CONFIGS[ch.type] || CHALLENGE_CONFIGS.envelope_100
                const cd = Array.isArray(ch.challenge_data) ? ch.challenge_data[0] : ch.challenge_data || {}
                const prog = cd.progress || []
                const saved = prog.length ? prog.reduce((s, v, i) => v ? s + cfg.slotValue(i, ch.multiplier || 1) : s, 0) : totalForMult(ch.multiplier || 1, ch.type)
                return (
                  <div key={ch.id} className="dash-history-card">
                    <div className="dhc-name">{ch.goal_label || cfg.label}</div>
                    <div className="dhc-meta">{cfg.label} · {fmt(saved, ch.currency || 'GBP')} saved</div>
                    {ch.completed_at && <div className="dhc-date">Completed {new Date(ch.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showSuggest && <SuggestModal onClose={() => setShowSuggest(false)} currentUser={currentUser} />}
      {showDeleteAccount && <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} />}
      {showChangeCurrency && <ChangeCurrencyModal onClose={() => setShowChangeCurrency(false)} />}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} onUpgraded={() => { setShowUpgrade(false); dispatch({ type: 'SET_CREATOR_RETURN_TO', payload: 'dashboard' }); navigate('/app/custom-creator') }} />}
    </div>
  )
}
