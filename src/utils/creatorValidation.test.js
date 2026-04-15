import { describe, it, expect } from 'vitest'
import {
  validateName,
  validateTiles,
  validateTarget,
  validateAmounts,
  getAutoHint,
} from './creatorValidation'

describe('validateName', () => {
  it('rejects empty string', () => {
    const r = validateName('')
    expect(r.valid).toBe(false)
    expect(r.type).toBe('hard')
  })
  it('rejects whitespace-only', () => {
    expect(validateName('   ').valid).toBe(false)
  })
  it('accepts a normal name', () => {
    expect(validateName('Holiday Fund').valid).toBe(true)
    expect(validateName('Holiday Fund').message).toBeNull()
  })
})

describe('validateTiles', () => {
  it('rejects empty string', () => {
    expect(validateTiles('').valid).toBe(false)
  })
  it('rejects 1 tile', () => {
    const r = validateTiles('1')
    expect(r.valid).toBe(false)
    expect(r.type).toBe('hard')
  })
  it('rejects 0', () => {
    expect(validateTiles('0').valid).toBe(false)
  })
  it('rejects decimal', () => {
    expect(validateTiles('5.5').valid).toBe(false)
  })
  it('accepts 2 tiles', () => {
    const r = validateTiles('2')
    expect(r.valid).toBe(true)
    expect(r.value).toBe(2)
  })
  it('accepts 100 tiles', () => {
    const r = validateTiles('100')
    expect(r.valid).toBe(true)
    expect(r.value).toBe(100)
  })
  it('soft-warns for > 200', () => {
    const r = validateTiles('201')
    expect(r.valid).toBe(true)      // still valid — just a warning
    expect(r.type).toBe('soft')
    expect(r.value).toBe(201)
  })
})

describe('validateTarget', () => {
  it('rejects empty string', () => expect(validateTarget('').valid).toBe(false))
  it('rejects zero',        () => expect(validateTarget('0').valid).toBe(false))
  it('rejects negative',    () => expect(validateTarget('-10').valid).toBe(false))
  it('rejects non-number',  () => expect(validateTarget('abc').valid).toBe(false))
  it('accepts valid target', () => {
    const r = validateTarget('500')
    expect(r.valid).toBe(true)
    expect(r.value).toBe(500)
  })
  it('accepts decimal target', () => {
    const r = validateTarget('1.50')
    expect(r.valid).toBe(true)
    expect(r.value).toBe(1.5)
  })
})

describe('validateAmounts', () => {
  it('rejects empty array',     () => expect(validateAmounts([]).valid).toBe(false))
  it('rejects single-tile',     () => expect(validateAmounts([100]).valid).toBe(false))
  it('rejects value below 0.01',() => expect(validateAmounts([10, 0, 20]).valid).toBe(false))
  it('rejects negative value',  () => expect(validateAmounts([10, -5, 20]).valid).toBe(false))
  it('accepts valid amounts',   () => expect(validateAmounts([10, 20, 30]).valid).toBe(true))
})

describe('getAutoHint', () => {
  it('returns null when inputs are null', () => {
    expect(getAutoHint(null, null, 2)).toBeNull()
  })
  it('returns null when per-tile amount is fine', () => {
    expect(getAutoHint(10, 100, 2)).toBeNull()
  })
  it('returns hint when per-tile amount < min', () => {
    // 100 tiles, £0.50 target → 0.005 per tile — below 0.01
    const hint = getAutoHint(100, 0.5, 2)
    expect(hint).not.toBeNull()
    expect(typeof hint).toBe('string')
  })
})
