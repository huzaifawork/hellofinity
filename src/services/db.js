import { sb, signOut } from './supabase'
import { CHALLENGE_CONFIGS } from '../utils/challengeConfigs'

// ─────────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────────

/**
 * Upsert user profile — called on every login and on setup completion.
 * Returns the profile row or null on failure.
 */
export async function dbUpsertProfile(userId, fields = {}) {
  if (!userId) return null
  const payload = {
    id: userId,
    last_seen_at: new Date().toISOString(),
    ...fields,
  }
  const { data, error } = await sb
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()
  if (error) { console.error('Profile upsert error:', error.message); return null }
  return data
}

/**
 * Load profile for a user. Returns { name, currency } or null.
 */
export async function dbLoadProfile(userId) {
  if (!userId) return null
  const { data, error } = await sb
    .from('profiles')
    .select('name, currency')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

// ─────────────────────────────────────────────
//  CHALLENGES
// ─────────────────────────────────────────────

/**
 * Attach challenge_progress rows to challenges.
 * Avoids PostgREST join syntax which requires a schema-cached FK relationship.
 */
async function attachProgress(challenges) {
  if (!challenges.length) return challenges
  const ids = challenges.map(c => c.id)
  const { data: rows, error } = await sb
    .from('challenge_progress')
    .select('challenge_id, progress, done_log, tile_amounts')
    .in('challenge_id', ids)
  if (error) {
    console.error('Attach progress error:', error.message)
    return challenges.map(ch => ({ ...ch, challenge_data: [{}] }))
  }
  const map = {}
  for (const r of (rows || [])) map[r.challenge_id] = r
  return challenges.map(ch => ({ ...ch, challenge_data: [map[ch.id] || {}] }))
}

export async function dbLoadActiveChallenges(userId) {
  const { data, error } = await sb
    .from('challenges')
    .select('id, user_id, type, goal_label, multiplier, currency, started_at, updated_at')
    .eq('user_id', userId)
    .is('completed_at', null)
    .order('started_at', { ascending: true })
  if (error) { console.error('Load challenges error:', error.message); return [] }
  return attachProgress(data || [])
}

export async function dbLoadArchivedChallenges(userId) {
  const { data, error } = await sb
    .from('challenges')
    .select('id, user_id, type, goal_label, multiplier, currency, started_at, completed_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
  if (error) { console.error('Load archived error:', error.message); return [] }
  return attachProgress(data || [])
}

export async function dbSaveProgress(challengeId, userId, envelopes, doneLog) {
  if (!challengeId || !userId) return
  const { error: progressError } = await sb
    .from('challenge_progress')
    .update({ progress: envelopes, done_log: doneLog })
    .eq('challenge_id', challengeId)
  if (progressError) { console.error('Progress save error:', progressError.message); return }
  await sb.from('challenges')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', challengeId).eq('user_id', userId)
}

export async function dbCreateChallenge(userId, name, goal, multiplier, challengeType, currency) {
  const config = CHALLENGE_CONFIGS[challengeType] || CHALLENGE_CONFIGS.envelope_100

  // Save profile (name + currency) alongside challenge creation
  await dbUpsertProfile(userId, { name, currency })

  const { data: ch, error } = await sb
    .from('challenges')
    .insert({
      user_id: userId,
      type: challengeType,
      goal_label: goal || null,
      multiplier: parseFloat(multiplier) || 1,
      currency,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) { console.error('Create challenge error:', error.message); return null }

  const { error: progressError } = await sb
    .from('challenge_progress')
    .insert({ challenge_id: ch.id, progress: Array(config.slots).fill(false), done_log: [] })
  if (progressError) { console.error('Progress init error:', progressError.message) }

  return ch
}

export function dbWriteEvent(challengeId, userId, eventType, envelopeIndex = null, metadata = null) {
  if (!challengeId || !userId) return
  sb.from('challenge_events').insert({
    challenge_id: challengeId,
    user_id: userId,
    event_type: eventType,
    envelope_index: envelopeIndex,
    metadata,
    created_at: new Date().toISOString(),
  }).then(() => {})
}

export async function dbArchiveChallenge(challengeId, userId) {
  const { error } = await sb.from('challenges')
    .update({ completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', challengeId).eq('user_id', userId)
  return !error
}

export async function dbDeleteChallenge(challengeId, userId) {
  await sb.from('challenge_events').delete().eq('challenge_id', challengeId)
  await sb.from('challenge_progress').delete().eq('challenge_id', challengeId)
  const { error } = await sb.from('challenges').delete()
    .eq('id', challengeId).eq('user_id', userId)
  return !error
}

export async function dbDeleteAccount(userId) {
  try {
    const { data: challenges } = await sb.from('challenges').select('id').eq('user_id', userId)
    if (challenges?.length) {
      for (const ch of challenges) {
        await sb.from('challenge_events').delete().eq('challenge_id', ch.id)
        await sb.from('challenge_progress').delete().eq('challenge_id', ch.id)
      }
      await sb.from('challenges').delete().eq('user_id', userId)
    }
    await sb.from('suggestions').delete().eq('user_id', userId)
    await sb.from('profiles').delete().eq('id', userId)
    await signOut()
    return true
  } catch (e) {
    console.error('Delete account error:', e.message)
    return false
  }
}

export async function dbSubmitSuggestion(userId, message) {
  const { error } = await sb.from('suggestions').insert({
    user_id: userId || null,
    message,
    created_at: new Date().toISOString(),
  })
  if (error) throw error
}

/**
 * Create a custom challenge with arbitrary tile amounts.
 * Stores tile_amounts in challenge_progress so ChallengeScreen can load them.
 */
export async function dbCreateCustomChallenge(userId, name, amounts, currency, spread, mode) {
  // Sync profile currency
  await dbUpsertProfile(userId, { currency })

  const { data: ch, error } = await sb
    .from('challenges')
    .insert({
      user_id:    userId,
      type:       'custom',
      goal_label: name || null,
      multiplier: 1,             // ignored for custom — amounts are absolute
      currency,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) { console.error('Create custom challenge error:', error.message); return null }

  const { error: progressError } = await sb
    .from('challenge_progress')
    .insert({
      challenge_id: ch.id,
      progress:     Array(amounts.length).fill(false),
      tile_amounts: amounts,
      done_log:     [],
      metadata: {
        created_from: 'custom_creator',
        version:      1,
        spread:       spread || null,
        mode:         mode  || null,
        generated_at: new Date().toISOString(),
      },
    })

  if (progressError) { console.error('Custom progress init error:', progressError.message) }

  return ch
}
