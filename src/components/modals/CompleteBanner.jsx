import React, { useState, useEffect } from 'react'
import { fmt } from '../../utils/formatters'

export default function CompleteBanner({ challenge, config, onClose, onNewChallenge, onDashboard, onShare, isArchivedMode }) {
  const [archiving, setArchiving] = useState(false)
  const [visible, setVisible] = useState(false)

  // Delay applying visible class so it transitions in
  useEffect(() => {
    setTimeout(() => setVisible(true), 50)
  }, [])

  if (!challenge || !config) return null

  const m = challenge.multiplier || 1
  let saved = 0

  const isCustomCh = challenge.challengeType === 'custom'
  const prog = challenge.envelopes || []
  const tileAmounts = isCustomCh ? (challenge.customAmounts || []) : []

  prog.forEach((v, i) => { 
    if (v) {
      if (isCustomCh) {
        saved += (tileAmounts[i] ?? 0)
      } else {
        saved += config.slotValue(i, m) 
      }
    }
  })

  // If length of progress isn't full, something went wrong, but fallback anyway:
  const totalSlots = isCustomCh ? tileAmounts.length : config.slots

  const startDate = challenge.startedAt
    ? new Date(challenge.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'
    
  const daysTaken = challenge.startedAt
    ? Math.max(1, Math.round((Date.now() - new Date(challenge.startedAt).getTime()) / 86400000))
    : '—'
    
  const daysLabel = daysTaken === 1 ? 'day' : 'days'

  async function handleArchiveDash() {
    setArchiving(true)
    try { await onDashboard?.() }
    finally { setArchiving(false); onClose?.() }
  }

  async function handleStartNew() {
    await onNewChallenge?.()
    onClose?.()
  }

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ 
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000, 
        padding: 20,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          background: 'var(--brand-dark, #4a0d0d)', 
          color: '#fff',
          maxWidth: 600,
          width: '100%',
          padding: '40px 30px',
          borderRadius: 24,
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
        <h2 style={{ 
          fontFamily: 'serif', 
          fontStyle: 'italic',
          color: '#f5c842', 
          fontSize: 36, 
          margin: '0 0 16px 0',
          fontWeight: 600
        }}>
          Challenge complete!
        </h2>
        <p style={{ margin: '0 0 30px 0', fontSize: 18, color: '#f5f2ed', opacity: 0.9 }}>
          You saved {fmt(saved, challenge.currency || 'GBP')}. Every single {config.slotLabel}. Incredible.
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 16, 
          marginBottom: 30 
        }}>
          {[
            { label: 'TOTAL SAVED', value: fmt(saved, challenge.currency || 'GBP'), color: '#3a7a53' }, 
            { label: 'TIME TAKEN', value: daysTaken, suffix: ` ${daysLabel}` },
            { label: 'STARTED', value: startDate },
            { label: 'TILES COMPLETED', value: totalSlots }
          ].map((stat, i) => (
            <div key={i} style={{ 
              background: '#f5f2ed',
              borderRadius: 16, 
              padding: '24px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 600, color: stat.color || '#22100c' }}>
                {stat.value}<span style={{ fontSize: 16, fontWeight: 400, color: '#888' }}>{stat.suffix}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <button 
            onClick={() => { onShare?.() }}
            style={{ 
              background: '#f5c842', 
              color: '#4a0d0d', 
              border: 'none', 
              borderRadius: 30, 
              padding: '16px 32px', 
              fontSize: 16, 
              fontWeight: 600,
              width: 'max-content',
              cursor: 'pointer'
            }}
          >
            Share my progress →
          </button>
          
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            <button 
              onClick={handleStartNew}
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                color: '#fff', 
                border: '1px solid rgba(255,255,255,0.2)', 
                borderRadius: 30, 
                padding: '12px 24px', 
                fontSize: 15, 
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Start a new challenge
            </button>
            {!isArchivedMode && (
              <button 
                onClick={handleArchiveDash}
                disabled={archiving}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  color: '#fff', 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  borderRadius: 30, 
                  padding: '12px 24px', 
                  fontSize: 15, 
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: archiving ? 0.7 : 1
                }}
              >
                {archiving ? 'Archiving...' : 'Archive this challenge'}
              </button>
            )}
            {isArchivedMode && (
              <button 
                onClick={onClose}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  color: '#fff', 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  borderRadius: 30, 
                  padding: '12px 24px', 
                  fontSize: 15, 
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
