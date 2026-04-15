import { describe, it, expect } from 'vitest'
import { generateAmounts, gridCols, parsePaste, fisherYates } from './tileCalculations'

// ── generateAmounts: equal ──────────────────────────────────────────────────

describe('generateAmounts equal', () => {
  it('returns correct count', () => {
    expect(generateAmounts(4, 100, 'equal', 2)).toHaveLength(4)
  })
  it('sums exactly to target (no float drift)', () => {
    const amounts = generateAmounts(3, 10, 'equal', 2)
    expect(amounts.reduce((s, v) => s + v, 0)).toBe(10)
  })
  it('all tiles are equal (before last-tile adjustment)', () => {
    const amounts = generateAmounts(4, 100, 'equal', 2)
    expect(amounts[0]).toBe(amounts[1])
    expect(amounts[1]).toBe(amounts[2])
  })
  it('handles JPY (0 decimals)', () => {
    const amounts = generateAmounts(3, 1000, 'equal', 0)
    expect(amounts.reduce((s, v) => s + v, 0)).toBe(1000)
    amounts.forEach(v => expect(Number.isInteger(v)).toBe(true))
  })
})

// ── generateAmounts: ascending ──────────────────────────────────────────────

describe('generateAmounts ascending', () => {
  it('returns ascending order', () => {
    const amounts = generateAmounts(4, 100, 'ascending', 2)
    expect(amounts[0]).toBeLessThan(amounts[1])
    expect(amounts[1]).toBeLessThan(amounts[2])
    expect(amounts[2]).toBeLessThan(amounts[3])
  })
  it('sums exactly to target', () => {
    const amounts = generateAmounts(5, 150, 'ascending', 2)
    expect(amounts.reduce((s, v) => s + v, 0)).toBe(150)
  })
})

// ── generateAmounts: descending ─────────────────────────────────────────────

describe('generateAmounts descending', () => {
  it('returns descending order', () => {
    const amounts = generateAmounts(4, 100, 'descending', 2)
    expect(amounts[0]).toBeGreaterThan(amounts[1])
    expect(amounts[1]).toBeGreaterThan(amounts[2])
  })
  it('sums exactly to target', () => {
    const amounts = generateAmounts(4, 200, 'descending', 2)
    expect(amounts.reduce((s, v) => s + v, 0)).toBe(200)
  })
})

// ── generateAmounts: random ─────────────────────────────────────────────────

describe('generateAmounts random', () => {
  it('returns correct length', () => {
    expect(generateAmounts(6, 100, 'random', 2)).toHaveLength(6)
  })
  it('sums exactly to target', () => {
    const amounts = generateAmounts(6, 100, 'random', 2)
    expect(amounts.reduce((s, v) => s + v, 0)).toBe(100)
  })
  it('contains same values as ascending (just shuffled)', () => {
    const asc = generateAmounts(5, 100, 'ascending', 2)
    const rnd = generateAmounts(5, 100, 'random', 2)
    expect([...asc].sort((a, b) => a - b)).toEqual([...rnd].sort((a, b) => a - b))
  })
})

// ── gridCols ────────────────────────────────────────────────────────────────

describe('gridCols', () => {
  it('returns 2 for 1-4 tiles',    () => { expect(gridCols(1)).toBe(2);  expect(gridCols(4)).toBe(2) })
  it('returns 3 for 5-9 tiles',    () => { expect(gridCols(5)).toBe(3);  expect(gridCols(9)).toBe(3) })
  it('returns 4 for 10-16 tiles',  () => { expect(gridCols(10)).toBe(4); expect(gridCols(16)).toBe(4) })
  it('returns 5 for 17-30 tiles',  () => { expect(gridCols(17)).toBe(5); expect(gridCols(30)).toBe(5) })
  it('returns 7 for 31-60 tiles',  () => { expect(gridCols(31)).toBe(7); expect(gridCols(60)).toBe(7) })
  it('returns 10 for 61-100 tiles',() => { expect(gridCols(61)).toBe(10);expect(gridCols(100)).toBe(10) })
  it('returns 12 for 101+ tiles',  () => { expect(gridCols(101)).toBe(12);expect(gridCols(200)).toBe(12) })
})

// ── parsePaste ──────────────────────────────────────────────────────────────

describe('parsePaste', () => {
  it('parses comma-separated', () => {
    expect(parsePaste('10, 20, 30')).toEqual([10, 20, 30])
  })
  it('parses newline-separated', () => {
    expect(parsePaste('10\n20\n30')).toEqual([10, 20, 30])
  })
  it('parses mixed separators', () => {
    expect(parsePaste('10, 20\n30,40')).toEqual([10, 20, 30, 40])
  })
  it('ignores non-numeric values silently', () => {
    expect(parsePaste('10, abc, 30')).toEqual([10, 30])
  })
  it('ignores values below 0.01', () => {
    expect(parsePaste('0, 0.001, 10')).toEqual([10])
  })
  it('returns empty array for all-invalid input', () => {
    expect(parsePaste('abc, xyz')).toEqual([])
  })
})

// ── fisherYates ─────────────────────────────────────────────────────────────

describe('fisherYates', () => {
  it('returns same length', () => {
    expect(fisherYates([1, 2, 3, 4, 5])).toHaveLength(5)
  })
  it('does not mutate the input array', () => {
    const original = [1, 2, 3, 4, 5]
    const copy = [...original]
    fisherYates(original)
    expect(original).toEqual(copy)
  })
  it('contains same elements', () => {
    const arr = [10, 20, 30, 40]
    const shuffled = fisherYates(arr)
    expect([...shuffled].sort((a, b) => a - b)).toEqual([...arr].sort((a, b) => a - b))
  })
})
