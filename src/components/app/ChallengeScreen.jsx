import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../hooks/useTheme'
import { useToast } from '../../hooks/useToast'
import { fmt, fmtCompact, totalForMult, getCalendarMonths } from '../../utils/formatters'
import { CHALLENGE_CONFIGS, MILESTONE_PCTS } from '../../utils/challengeConfigs'
import { gridCols as customGridCols } from '../../utils/tileCalculations'
import { dbSaveProgress, dbWriteEvent, dbArchiveChallenge } from '../../services/db'
import { sb, signOut } from '../../services/supabase'
import { showMilestoneBanner } from '../common/MilestoneBanner'
import { launchConfetti } from '../common/Confetti'
import Confetti from '../common/Confetti'
import ShareModal from '../modals/ShareModal'
import EditGoalModal from '../modals/EditGoalModal'
import TargetDateModal from '../modals/TargetDateModal'
import HelpModal from '../modals/HelpModal'
import SuggestModal from '../modals/SuggestModal'
import DeleteAccountModal from '../modals/DeleteAccountModal'
import ChangeCurrencyModal from '../modals/ChangeCurrencyModal'
import AbandonModal from '../modals/AbandonModal'
import CompleteBanner from '../modals/CompleteBanner'

const MARK_LIGHT = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMjIxMDBDIi8+PGxpbmUgeDE9IjI1IiB5MT0iMjAiIHgyPSIyNSIgeTI9IjgwIiBzdHJva2U9IiNGNUYyRUQiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxsaW5lIHgxPSI1MCIgeTE9IjIwIiB4Mj0iNTAiIHkyPSI4MCIgc3Ryb2tlPSIjRjVGMkVEIiBzdHJva2Utd2lkdGg9IjEwIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48bGluZSB4MT0iNTAiIHkxPSIyMCIgeDI9Ijc1IiB5Mj0iMjAiIHN0cm9rZT0iI0Y1RjJFRCIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTE4IDU1IFE0NSA3OCA4NSA1MCIgc3Ryb2tlPSIjRjVDODQyIiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==`

export default function ChallengeScreen({ visible }) {
  const { state, dispatch, saveTimeoutRef } = useApp()
  const navigate = useNavigate()
  const { challenge, challengeId, currentUser, activeChallenges } = state
  const { theme, toggleTheme, isDark } = useTheme()
  const { showToast } = useToast()

  const [filter, setFilter] = useState('all')
  const [highlighted, setHighlighted] = useState(null)
  const [randResult, setRandResult] = useState(null)
  const [popping, setPopping] = useState(null)
  const [undoState, setUndoState] = useState(null)
  const [savingState, setSavingState] = useState('idle')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showEditGoal, setShowEditGoal] = useState(false)
  const [showTargetDate, setShowTargetDate] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [showChangeCurrency, setShowChangeCurrency] = useState(false)
  const [showAbandon, setShowAbandon] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const undoTimerRef = useRef(null)
  const milestonesRef = useRef(new Set())

  const config = CHALLENGE_CONFIGS[challenge.challengeType] || CHALLENGE_CONFIGS.envelope_100
  const m = challenge.multiplier
  const currency = challenge.currency

  const isCustom      = challenge.challengeType === 'custom'
  const customAmounts = isCustom ? (challenge.customAmounts || []) : []
  const totalSlots    = isCustom ? customAmounts.length : config.slots

  function slotVal(i) {
    return isCustom ? (customAmounts[i] ?? 0) : config.slotValue(i, m)
  }

  const done      = challenge.envelopes.filter(Boolean).length
  const saved     = challenge.envelopes.reduce((s, v, i) => v ? s + slotVal(i) : s, 0)
  const total     = isCustom ? customAmounts.reduce((s, v) => s + v, 0) : config.totalFn(m)
  const remaining = total - saved
  const pct       = totalSlots > 0 ? Math.round(done / totalSlots * 100) : 0

  function queueSave(envelopes, doneLog) {
    setSavingState('saving')
    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      await dbSaveProgress(challengeId, currentUser?.id, envelopes, doneLog)
      setSavingState('saved')
      setTimeout(() => setSavingState('idle'), 1200)
    }, 1200)
  }

  function toggleEnvelope(i) {
    const next = [...challenge.envelopes]
    next[i] = !next[i]
    const ts = Date.now()
    const entry = { index: i, value: slotVal(i), ts, done: next[i] }
    const doneLog = [...(challenge.doneLog || []), entry]
    dispatch({ type: 'SET_CHALLENGE', payload: { envelopes: next, doneLog } })
    // Keep activeChallenges in sync so dashboard cards show live progress
    const updatedActive = activeChallenges.map(c => {
      if (c.id !== challengeId) return c
      const existing = Array.isArray(c.challenge_data) ? c.challenge_data[0] : (c.challenge_data || {})
      return { ...c, challenge_data: [{ ...existing, progress: next, done_log: doneLog }] }
    })
    dispatch({ type: 'SET_ACTIVE_CHALLENGES', payload: updatedActive })
    queueSave(next, doneLog)
    if (next[i]) {
      setPopping(i)
      setTimeout(() => setPopping(p => p === i ? null : p), 350)
      dbWriteEvent(challengeId, currentUser?.id, 'envelope_filled', i, { value: slotVal(i) })
      checkMilestones(next)
    } else {
      dbWriteEvent(challengeId, currentUser?.id, 'envelope_unfilled', i)
    }
    setUndoState({ index: i, wasDone: !next[i], envelopes: challenge.envelopes, doneLog: challenge.doneLog })
    clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => setUndoState(null), 5000)
  }

  function undoLast() {
    if (!undoState) return
    dispatch({ type: 'SET_CHALLENGE', payload: { envelopes: undoState.envelopes, doneLog: undoState.doneLog } })
    queueSave(undoState.envelopes, undoState.doneLog)
    setUndoState(null)
    clearTimeout(undoTimerRef.current)
  }

  function checkMilestones(envelopes) {
    const doneCount = envelopes.filter(Boolean).length
    const pctNow = totalSlots > 0 ? doneCount / totalSlots * 100 : 0
    if (doneCount === totalSlots && totalSlots > 0 && !state.celebrationMap.get(challengeId)) {
      dispatch({ type: 'SET_CELEBRATION', challengeId, payload: true })
      launchConfetti(60)
      setTimeout(() => setShowComplete(true), 400)
      return
    }
    MILESTONE_PCTS.forEach(mp => {
      const threshold = Math.round(totalSlots * mp / 100)
      if (doneCount >= threshold && !milestonesRef.current.has(mp)) {
        milestonesRef.current.add(mp)
        if (mp < 100) {
          launchConfetti(30)
          showMilestoneBanner(
            `${mp}% done! 🎉`,
            `You've filled ${doneCount} of ${totalSlots} ${config.slotLabelPlural}. Keep going!`,
            mp >= 50,
            () => setShowShare(true)
          )
        }
      }
    })
  }

  function pickRandom() {
    const rem = challenge.envelopes.map((v, i) => (!v ? i : null)).filter(v => v !== null)
    if (!rem.length) { showToast('All done! 🎉'); return }
    const pick = rem[Math.floor(Math.random() * rem.length)]
    setHighlighted(pick)
    setRandResult(pick)
    document.getElementById(`env-${pick + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

  function getFilteredCells(envelopes) {
    return envelopes.map((v, i) => {
      if (filter === 'todo' && v) return null
      if (filter === 'done' && !v) return null
      return i
    })
  }

  const moodText = pct === 0 ? 'Ready to start!' : pct < 25 ? 'Just getting started.' : pct < 50 ? 'Building momentum!' : pct < 75 ? 'Over halfway!' : pct < 100 ? 'Almost there!' : 'Complete! 🎉'

  if (!visible) return null

  return (
    <div id="screen-app" className="screen active">
      <Confetti />

      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-mark">
            <img src={MARK_LIGHT} alt="" style={{ width: 20, height: 20 }} />
          </div>
          <div className="header-name">Hello<span>Finity</span></div>
        </div>
        <div className="header-goal">
          {challenge.goal ? `Saving for: ${challenge.goal}` : `Hi, ${challenge.name}.`}
        </div>
        <div className="header-right">
          <span className={`saving-indicator${savingState !== 'idle' ? ' visible' : ''}${savingState === 'saved' ? ' saved' : ''}`}>
            {savingState === 'saving' ? 'Saving…' : 'Saved ✓'}
          </span>
          <button className="theme-toggle" onClick={toggleTheme}
            dangerouslySetInnerHTML={{ __html: isDark
              ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
              : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
            }}
          />
          <div style={{ position: 'relative' }}>
            <button className="header-avatar-btn" onClick={() => setAccountMenuOpen(o => !o)} title="Account">
            <span className="header-avatar-initial">
              {(challenge.name && challenge.name !== 'there' ? challenge.name : currentUser?.email || '?')[0].toUpperCase()}
            </span>
          </button>
            {accountMenuOpen && (
              <div className="account-menu" style={{ display: 'block' }}>
                <button onClick={() => { setAccountMenuOpen(false); navigate('/app/dashboard') }}>← Dashboard</button>
                <button onClick={() => { setAccountMenuOpen(false); setShowEditGoal(true) }}>Edit goal</button>
                <button onClick={() => { setAccountMenuOpen(false); setShowHelp(true) }}>Help</button>
                <button onClick={() => { setAccountMenuOpen(false); setShowSuggest(true) }}>Suggestions</button>
                <button onClick={() => { setAccountMenuOpen(false); dispatch({ type: 'SET_AUTH_PANEL', payload: 'panel-name' }); navigate('/app/setup') }}>New challenge</button>
                <button onClick={() => { setAccountMenuOpen(false); setShowChangeCurrency(true) }}>Change currency</button>
                <button onClick={() => { setAccountMenuOpen(false); setShowDeleteAccount(true) }} className="danger">Delete account</button>
                <button onClick={() => signOut()}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="app-content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card hero">
            <div className="stat-label">Saved</div>
            <div className="stat-value">{fmt(saved, currency)}</div>
            <div className="stat-sub">of {fmt(total, currency)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Done</div>
            <div className="stat-value">{done}</div>
            <div className="stat-sub">of {totalSlots}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Remaining</div>
            <div className="stat-value">{totalSlots - done}</div>
            <div className="stat-sub">{config.slotLabelPlural}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Progress</div>
            <div className="stat-value">{pct}%</div>
            <div className="stat-sub">{moodText}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-section">
          <div className="progress-header">
            <div className="progress-label">Progress</div>
            <div className="progress-mood">{moodText}</div>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Filter */}
        <div className="filter-bar">
          {['all', 'todo', 'done'].map(f => (
            <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'todo' ? 'To do' : 'Done'}
            </button>
          ))}
        </div>

        {/* Grid title */}
        <div className="grid-section">
          <div className="grid-header">
            <div className="grid-title">Your {totalSlots} {config.slotLabelPlural}</div>
          </div>

          {/* Envelope grid */}
          {challenge.challengeType === 'envelope_100' && (
            <div id="envelope-grid" className="envelope-grid" style={{ gridTemplateColumns: `repeat(${config.gridCols}, 1fr)` }}>
              {challenge.envelopes.map((isDone, i) => {
                if (filter === 'todo' && isDone) return null
                if (filter === 'done' && !isDone) return null
                return (
                  <div key={i} id={`env-${i + 1}`}
                    className={['env-cell', isDone ? 'done' : '', highlighted === i ? 'highlighted' : '', popping === i ? 'popping' : ''].filter(Boolean).join(' ')}
                    onClick={() => toggleEnvelope(i)}>
                    <div className="env-done-tick">✓</div>
                    <div className="env-num">{i + 1}</div>
                    <div className="env-amt">{fmtCompact(config.slotValue(i, m), currency)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Week grid */}
          {challenge.challengeType === 'week_52' && (
            <WeekGrid envelopes={challenge.envelopes} config={config} m={m} currency={currency}
              filter={filter} highlighted={highlighted} popping={popping}
              onToggle={toggleEnvelope} startedAt={challenge.startedAt} />
          )}

          {/* Day grid */}
          {challenge.challengeType === 'day_365' && (
            <DayGrid envelopes={challenge.envelopes} config={config} m={m} currency={currency}
              filter={filter} highlighted={highlighted} popping={popping}
              onToggle={toggleEnvelope} startedAt={challenge.startedAt} />
          )}

          {/* Custom challenge grid */}
          {challenge.challengeType === 'custom' && (
            <div
              className="envelope-grid"
              style={{ gridTemplateColumns: `repeat(${customGridCols(customAmounts.length)}, 1fr)` }}
            >
              {challenge.envelopes.map((isDone, i) => {
                if (filter === 'todo' && isDone)  return null
                if (filter === 'done' && !isDone) return null
                return (
                  <div
                    key={i}
                    id={`env-${i + 1}`}
                    className={['env-cell', isDone ? 'done' : '', highlighted === i ? 'highlighted' : '', popping === i ? 'popping' : ''].filter(Boolean).join(' ')}
                    onClick={() => toggleEnvelope(i)}
                  >
                    <div className="env-done-tick">✓</div>
                    <div className="env-num">{i + 1}</div>
                    <div className="env-amt">{fmtCompact(slotVal(i), currency)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Randomiser */}
        <div className="randomiser-section">
          <div className="rand-inner">
            <div className="rand-eyebrow">Random pick</div>
            <div className={`rand-result${randResult !== null ? ' has-result' : ''}`}>
              {randResult !== null ? `${config.slotLabel === 'envelope' ? '#' : ''}${randResult + 1} — ${fmt(slotVal(randResult), currency)}` : 'Pick for me'}
            </div>
            <div className="rand-sub">{randResult !== null ? `Tap envelope #${randResult + 1} above to mark it.` : `Tap the button to pick a random ${config.slotLabel}`}</div>
          </div>
          <button className="rand-btn" onClick={pickRandom}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22"/>
              <path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.5 2.2"/>
              <path d="M22 18h-5.9c-1.3 0-2.5-.6-3.3-1.7l-.5-.8"/><path d="m18 14 4 4-4 4"/>
            </svg>
          </button>
        </div>

        {/* Undo */}
        {undoState && (
          <div className="toast-undo" style={{ display: 'flex' }}>
            <span>{undoState.wasDone ? `Unmarked ${config.slotLabel} ${undoState.index + 1}` : `Marked ${config.slotLabel} ${undoState.index + 1}`}</span>
            <button onClick={undoLast}>Undo</button>
          </div>
        )}
      </main>

      {/* FABs */}
      <div className="fab-row" style={{ display: 'flex' }}>
        <button className="fab-btn" onClick={scrollToTop} title="Scroll to top">↑</button>
        <button className="fab-btn fab-btn--primary" onClick={pickRandom} title="Random pick">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/>
            <path d="M2 6h1.9c1.5 0 2.9.9 3.5 2.2"/><path d="M22 18h-5.9c-1.3 0-2.5-.6-3.3-1.7l-.5-.8"/><path d="m18 14 4 4-4 4"/>
          </svg>
        </button>
        <button className="fab-btn" onClick={() => setShowShare(true)} title="Share">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>

      {/* Modals */}
      {showShare && <ShareModal challenge={challenge} challengeId={challengeId} config={config} onClose={() => setShowShare(false)} />}
      {showEditGoal && <EditGoalModal onClose={() => setShowEditGoal(false)} />}
      {showTargetDate && <TargetDateModal onClose={() => setShowTargetDate(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showSuggest && <SuggestModal onClose={() => setShowSuggest(false)} currentUser={currentUser} />}
      {showDeleteAccount && <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} />}
      {showChangeCurrency && <ChangeCurrencyModal onClose={() => setShowChangeCurrency(false)} />}
      {showAbandon && <AbandonModal onClose={() => setShowAbandon(false)} />}
      {showComplete && <CompleteBanner challenge={challenge} config={config} onClose={() => setShowComplete(false)} onNewChallenge={() => { setShowComplete(false); dispatch({ type: 'SET_AUTH_PANEL', payload: 'panel-challenge' }); navigate('/app/setup') }} onDashboard={async () => { if (challengeId && currentUser) { await dbArchiveChallenge(challengeId, currentUser.id) } setShowComplete(false); navigate('/app/dashboard') }} />}
    </div>
  )
}

function WeekGrid({ envelopes, config, m, currency, filter, highlighted, popping, onToggle, startedAt }) {
  const start = new Date(startedAt || new Date())
  start.setHours(0, 0, 0, 0)
  const months = []
  let cur = null
  for (let i = 0; i < 52; i++) {
    const ws = new Date(start); ws.setDate(ws.getDate() + i * 7)
    const key = `${ws.getFullYear()}-${ws.getMonth()}`
    const label = ws.toLocaleDateString('en-GB', { month: 'short' }); const year = ws.getFullYear()
    const dateLabel = ws.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    if (!cur || cur.key !== key) { cur = { key, label, year, weeks: [] }; months.push(cur) }
    cur.weeks.push({ index: i, dateLabel })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {months.map(mg => {
        const mgDone = mg.weeks.filter(w => envelopes[w.index]).length
        return (
          <div key={mg.key} className="challenge-group">
            <div className="challenge-group-header">
              <div className="challenge-group-label">{mg.label} <span>{mg.year}</span></div>
              <div className="challenge-group-count">{mgDone}/{mg.weeks.length}</div>
            </div>
            <div className="week-grid">
              {mg.weeks.map(w => {
                const done = envelopes[w.index]
                if (filter === 'todo' && done) return null
                if (filter === 'done' && !done) return null
                return (
                  <div key={w.index} id={`env-${w.index + 1}`}
                    className={['env-cell', done ? 'done' : '', highlighted === w.index ? 'highlighted' : '', popping === w.index ? 'popping' : ''].filter(Boolean).join(' ')}
                    onClick={() => onToggle(w.index)}>
                    <div className="env-done-tick">✓</div>
                    <div className="env-num">W{w.index + 1}</div>
                    <div className="env-amt">{fmtCompact(config.slotValue(w.index, m), currency)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayGrid({ envelopes, config, m, currency, filter, highlighted, popping, onToggle, startedAt }) {
  const months = getCalendarMonths(startedAt)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {months.map((mo, mi) => {
        const days = Array.from({ length: mo.count }, (_, d) => mo.globalStart + d)
        const moDone = days.filter(i => envelopes[i]).length
        return (
          <div key={mi} className="challenge-group">
            <div className="challenge-group-header">
              <div className="challenge-group-label">{mo.label} <span>{mo.year}</span></div>
              <div className="challenge-group-count">{moDone}/{mo.count}</div>
            </div>
            <div className="day-grid">
              {days.map(globalDay => {
                const done = envelopes[globalDay]
                if (filter === 'todo' && done) return null
                if (filter === 'done' && !done) return null
                return (
                  <div key={globalDay} id={`env-${globalDay + 1}`}
                    className={['env-cell', done ? 'done' : '', highlighted === globalDay ? 'highlighted' : '', popping === globalDay ? 'popping' : ''].filter(Boolean).join(' ')}
                    onClick={() => onToggle(globalDay)}>
                    <div className="env-done-tick">✓</div>
                    <div className="env-num">{globalDay + 1}</div>
                    <div className="env-amt">{fmtCompact(config.slotValue(globalDay, m), currency)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
