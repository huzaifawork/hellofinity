// Pure calculation functions — no React, no side effects, no imports.

// ── Internal helpers ────────────────────────────────────────────────────────

function round(value, precision) {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

/**
 * Corrects floating-point drift by adjusting the last tile so
 * sum(amounts) === target exactly.
 */
function finalize(amounts, target, precision) {
  // Sum all but the last element
  let sum = 0
  for (let i = 0; i < amounts.length - 1; i++) {
    sum = round(sum + amounts[i], precision)
  }
  // Set last to make the total exact
  amounts[amounts.length - 1] = round(target - sum, precision)
  return amounts
}

// ── Spread generators ───────────────────────────────────────────────────────

function generateEqual(n, total, precision) {
  const base = round(total / n, precision)
  const amounts = Array(n).fill(base)
  return finalize(amounts, total, precision)
}

function generateAscending(n, total, precision) {
  // weights = [1, 2, 3, ..., n], sum = n*(n+1)/2
  const weightSum = (n * (n + 1)) / 2
  const scale = total / weightSum
  const amounts = Array.from({ length: n }, (_, i) => round((i + 1) * scale, precision))
  return finalize(amounts, total, precision)
}

function generateDescending(n, total, precision) {
  // Reverse a fresh ascending array (don't mutate)
  return [...generateAscending(n, total, precision)].reverse()
}

/**
 * Shuffle arr using Fisher-Yates. Does NOT mutate input — returns a new array.
 */
export function fisherYates(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateRandom(n, total, precision) {
  // Shuffle the ascending result, then re-finalize to correct any
  // float drift caused by adding numbers in a different order.
  const shuffled = fisherYates(generateAscending(n, total, precision))
  return finalize(shuffled, total, precision)
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate tile amounts.
 * @param {number} n          - Number of tiles
 * @param {number} total      - Target total
 * @param {string} spread     - 'equal' | 'ascending' | 'descending' | 'random'
 * @param {number} precision  - Decimal places (from CURRENCIES[code].decimals)
 * @returns {number[]}        - Array of tile amounts, sum === total exactly
 */
export function generateAmounts(n, total, spread, precision = 2) {
  const generators = {
    equal:      generateEqual,
    ascending:  generateAscending,
    descending: generateDescending,
    random:     generateRandom,
  }
  return (generators[spread] || generateEqual)(n, total, precision)
}

/**
 * Compute grid column count based on tile count for readable, touch-friendly layout.
 */
export function gridCols(n) {
  if (n <= 4)   return 2
  if (n <= 9)   return 3
  if (n <= 16)  return 4
  if (n <= 30)  return 5
  if (n <= 60)  return 7
  if (n <= 100) return 10
  return 12
}

/**
 * Parse a paste string of comma/newline-separated numbers.
 * Invalid values and values below 0.01 are silently ignored.
 * Returns a single flat array — always one state update regardless of count.
 */
export function parsePaste(rawText) {
  return rawText
    .split(/[\n,]+/)
    .map(s => parseFloat(s.trim()))
    .filter(v => !isNaN(v) && v >= 0.01)
}
