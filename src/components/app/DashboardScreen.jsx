import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../hooks/useTheme'
import { fmt, totalForMult, formatDate } from '../../utils/formatters'
import { CHALLENGE_CONFIGS } from '../../utils/challengeConfigs'
import { dbLoadArchivedChallenges, dbArchiveChallenge, dbDeleteChallenge } from '../../services/db'
import { sb, signOut } from '../../services/supabase'
import HelpModal from '../modals/HelpModal'
import SuggestModal from '../modals/SuggestModal'
import DeleteAccountModal from '../modals/DeleteAccountModal'
import ChangeCurrencyModal from '../modals/ChangeCurrencyModal'
import UpgradeModal from '../modals/UpgradeModal'
import CompleteBanner from '../modals/CompleteBanner'
import ShareModal from '../modals/ShareModal'

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
  const [viewArchived, setViewArchived] = useState(null)
  const [showShare, setShowShare] = useState(false)
  const [archiveLimit, setArchiveLimit] = useState(2)

  useEffect(() => {
    if (!visible || !currentUser) return
    dbLoadArchivedChallenges(currentUser.id).then(setArchived)
  }, [visible, currentUser])

  useEffect(() => {
    if (!visible || !currentUser || activeChallenges.length === 0) return

    const toArchive = activeChallenges.filter(ch => {
      const cfg = CHALLENGE_CONFIGS[ch.type] || CHALLENGE_CONFIGS.envelope_100
      const cd = Array.isArray(ch.challenge_data) ? ch.challenge_data[0] : (ch.challenge_data || {})
      const prog = cd.progress || []
      const done = prog.filter(Boolean).length
      const isCustomCh = ch.type === 'custom'
      const tileAmounts = isCustomCh ? (cd.tile_amounts || []) : []
      const totalSlots = isCustomCh ? tileAmounts.length : cfg.slots
      const pct = totalSlots > 0 ? Math.round(done / totalSlots * 100) : 0
      return pct >= 100
    })

    if (toArchive.length > 0) {
      toArchive.forEach(ch => {
        dbArchiveChallenge(ch.id, currentUser.id)
      })
      const remaining = activeChallenges.filter(ch => !toArchive.find(t => t.id === ch.id))
      dispatch({ type: 'SET_ACTIVE_CHALLENGES', payload: remaining })
      const archivedIds = toArchive.map(t => t.id)
      if (archivedIds.includes(challengeId)) {
        dispatch({ type: 'SET_CHALLENGE_ID', payload: remaining[0]?.id || null })
      }
      dbLoadArchivedChallenges(currentUser.id).then(setArchived)
    }
  }, [visible, currentUser, activeChallenges, challengeId])

  if (!visible) return null

  const hour = new Date().getHours()
  const timeGreet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const m = currentUser?.user_metadata || {}
  const rawName = (challenge?.name && challenge.name.trim() !== '' && challenge.name !== 'there')
    ? challenge.name
    : (m.first_name || m.full_name || m.name || 'there')
  const displayName = (rawName && (rawName.includes('@') || rawName.includes('.'))) ? 'there' : rawName
  const greeting = `${timeGreet}${displayName !== 'there' ? ', ' + displayName : ''} 👋`

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
      updatedAt:     ch.updated_at,
    }})
    navigate('/app/challenge')
  }

  async function archiveChallenge(chId) {
    if (!currentUser) return
    if (!window.confirm('Archive this challenge? This cannot be undone.')) return
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
                {(displayName || currentUser?.email || '?')[0].toUpperCase()}
              </span>
            </button>
            {menuOpen && (
              <div className="account-menu" style={{ display: 'block' }}>
                <button onClick={() => { setMenuOpen(false); setShowHelp(true) }}>Help</button>
                <button onClick={() => { setMenuOpen(false); setShowSuggest(true) }}>Suggestions</button>
                <button onClick={() => { setMenuOpen(false); setShowChangeCurrency(true) }}>Change currency</button>
                <button onClick={() => { setMenuOpen(false); navigate('/app/privacy') }}>Privacy Policy</button>
                <button onClick={() => { setMenuOpen(false); navigate('/app/terms') }}>Terms of Service</button>
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

        {/* Helpers for Meta */}
        {(() => {
          window.timeAgo = (date) => {
            if (!date) return 'Never'
            const seconds = Math.floor((new Date() - new Date(date)) / 1000)
            if (seconds < 60) return 'Just now'
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
            const days = Math.floor(seconds / 86400)
            if (days === 1) return 'Yesterday'
            if (days < 30) return `${days} days ago`
            return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          }
          window.estFinish = (startedAt, saved, total) => {
            if (!startedAt || !saved || !total || saved <= 0 || saved >= total) return '—'
            const msPassed = Date.now() - new Date(startedAt).getTime()
            const daysPassed = Math.max(0.1, msPassed / 86400000)
            const rate = saved / daysPassed
            const remaining = total - saved
            const daysLeft = remaining / rate
            if (daysLeft > 3650) return 'Over 10 years'
            const finish = new Date(Date.now() + daysLeft * 86400000)
            return finish.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          }
          return null
        })()}

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
            <div className="dash-stat-label">Days saving</div>
            <div className="dash-stat-value">{challenge.startedAt ? Math.max(1, Math.floor((Date.now() - new Date(challenge.startedAt).getTime()) / 86400000)) : '—'}</div>
          </div>
        </div>

        {/* Challenges list */}
        <div className="dash-section-header">
          <div className="dash-section-title">Your challenges</div>
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
            const total = isCustomCh
              ? tileAmounts.reduce((s, v) => s + v, 0)
              : totalForMult(ch.multiplier || 1, ch.type)
            
            return (
              <div key={ch.id} className="dash-challenge-card" onClick={() => openChallenge(ch)}>
                <div className="dcc-header">
                  <div className="dcc-type-pill">{cfg.label}</div>
                  <div className="dcc-saved-large">
                    {fmt(saved, ch.currency || 'GBP')}
                    <div className="dcc-total-sub">of {fmt(total, ch.currency || 'GBP')}</div>
                  </div>
                </div>

                <div className="dcc-body">
                  <h3 className="dcc-title">{ch.goal_label || 'My Savings Challenge'}</h3>
                  <p className="dcc-subtitle">{done} of {totalSlots} {cfg.slotLabelPlural || 'slots'} filled</p>
                </div>

                <div className="dcc-progress-area">
                  <div className="dcc-progress-track-premium">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="dcc-progress-meta">
                    <span className="dcc-pct">{pct}%</span>
                    <span className="dcc-mood">{pct === 0 ? 'Ready to start!' : pct < 100 ? "You've made a start" : 'Complete! 🎉'}</span>
                    <span className="dcc-arrow">→</span>
                  </div>
                </div>

                <div className="dcc-dates-row">
                  <div className="dcc-date-field">
                    <span>Started:</span> {new Date(ch.started_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="dcc-date-field">
                    <span>Est. finish:</span> {window.estFinish(ch.started_at, saved, total)}
                  </div>
                </div>

                <div className="dcc-footer-actions" onClick={e => e.stopPropagation()}>
                  <button className="dcc-btn-sec" onClick={() => archiveChallenge(ch.id)}>Archive</button>
                  <button className="dcc-btn-sec danger" onClick={() => deleteChallenge(ch.id)}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="dash-section-header" style={{ marginTop: '1.75rem' }}>
          <div className="dash-section-title">Add a challenge</div>
        </div>
        <div className="dash-add-card" onClick={() => { dispatch({ type: 'SET_AUTH_PANEL', payload: 'panel-challenge' }); navigate('/app/setup') }}>
            <div className="dac-icon">
              <span>+</span>
            </div>
            <div className="dac-content">
              <div className="dac-title">{activeChallenges.length > 0 ? 'Start another challenge' : 'Start your first challenge'}</div>
              <div className="dac-subtitle">100 envelopes, 52 weeks, or 365 days</div>
            </div>
            <div className="dac-arrow">→</div>
          </div>

        {/* Archived */}
        {archived.length > 0 && (
          <>
            <div className="dash-section-header" style={{ marginTop: '1.75rem' }}>
              <div className="dash-section-title">Completed challenges</div>
            </div>
            <div className="dash-history-list">
              {archived.slice(0, archiveLimit).map(ch => {
                const cfg = CHALLENGE_CONFIGS[ch.type] || CHALLENGE_CONFIGS.envelope_100
                const cd = Array.isArray(ch.challenge_data) ? ch.challenge_data[0] : ch.challenge_data || {}
                const prog = cd.progress || []
                const isCustomCh = ch.type === 'custom'
                const tileAmounts = isCustomCh ? (cd.tile_amounts || []) : []
                const saved = prog.length 
                  ? (isCustomCh 
                      ? prog.reduce((s, v, i) => v ? s + (tileAmounts[i] ?? 0) : s, 0)
                      : prog.reduce((s, v, i) => v ? s + cfg.slotValue(i, ch.multiplier || 1) : s, 0))
                  : (isCustomCh 
                      ? tileAmounts.reduce((s, v) => s + v, 0)
                      : totalForMult(ch.multiplier || 1, ch.type))
                
                const totalGoal = isCustomCh 
                  ? tileAmounts.reduce((s, v) => s + v, 0)
                  : totalForMult(ch.multiplier || 1, ch.type)

                return (
                  <div 
                    key={ch.id} 
                    className="dash-history-card" 
                    onClick={() => {
                      setViewArchived({
                        challenge: {
                          id: ch.id,
                          name: currentUser?.user_metadata?.first_name || '',
                          multiplier: ch.multiplier || 1,
                          challengeType: ch.type || 'envelope_100',
                          currency: ch.currency || 'GBP',
                          envelopes: prog.length > 0 ? prog : Array(cfg.slots).fill(true),
                          customAmounts: tileAmounts,
                          startedAt: ch.started_at,
                          completedAt: ch.completed_at
                        },
                        config: cfg
                      })
                    }}
                  >
                    <div className="dhc-header">
                      <div className="dhc-type-pill">{cfg.label}</div>
                      <div className="dhc-amount-large">
                        {fmt(saved, ch.currency || 'GBP')}
                        <div className="dhc-amount-sub">
                          {saved >= totalGoal && totalGoal > 0 ? 'saved in full' : `of ${fmt(totalGoal, ch.currency || 'GBP')}`}
                        </div>
                      </div>
                    </div>

                    <div className="dhc-body">
                      <h3 className="dhc-title">{ch.goal_label || 'Savings Challenge'}</h3>
                      <div className="dhc-completed-on">
                        Completed {ch.completed_at ? formatDate(ch.completed_at, true) : 'Recently'}
                      </div>
                    </div>

                    <div className="dhc-meta-row">
                      <div className="dhc-meta-field">
                        SAVING SINCE: <span>{ch.started_at ? formatDate(ch.started_at, true) : '—'}</span>
                      </div>
                      <div className="dhc-meta-field">
                        COMPLETED: <span>{ch.completed_at ? formatDate(ch.completed_at, true) : '—'}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {archived.length > archiveLimit && (
                <button 
                  className="dash-show-more-btn" 
                  onClick={() => setArchiveLimit(prev => prev + 5)}
                >
                  Show {archived.length - archiveLimit} more
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showSuggest && <SuggestModal onClose={() => setShowSuggest(false)} currentUser={currentUser} />}
      {showDeleteAccount && <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} />}
      {showChangeCurrency && <ChangeCurrencyModal onClose={() => setShowChangeCurrency(false)} />}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} onUpgraded={() => { setShowUpgrade(false); dispatch({ type: 'SET_CREATOR_RETURN_TO', payload: 'dashboard' }); navigate('/app/custom-creator') }} />}
      {viewArchived && (
        <CompleteBanner 
          challenge={viewArchived.challenge} 
          config={viewArchived.config} 
          isArchivedMode={true} 
          onClose={() => setViewArchived(null)} 
          onShare={() => setShowShare(true)}
          onNewChallenge={() => { setViewArchived(null); dispatch({ type: 'SET_AUTH_PANEL', payload: 'panel-challenge' }); navigate('/app/setup') }}
        />
      )}
      {showShare && viewArchived && (
        <ShareModal 
          challenge={viewArchived.challenge} 
          challengeId={viewArchived.challenge.id} 
          config={viewArchived.config} 
          onClose={() => setShowShare(false)} 
        />
      )}
    </div>
  )
}
