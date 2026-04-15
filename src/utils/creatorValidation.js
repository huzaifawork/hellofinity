// Validation rules for the Custom Challenge Creator.
// Each function returns: { valid: boolean, type: 'hard'|'soft'|null, message: string|null, value? }

function r(valid, type, message, value) {
  return { valid, type: valid ? type : (type || null), message: valid ? null : message, value: value ?? null }
}

export function validateName(name) {
  if (!name || !name.trim())
    return r(false, 'hard', 'Give your challenge a name to continue.')
  return r(true, null, null)
}

export function validateTiles(tilesInput) {
  if (!tilesInput && tilesInput !== 0)
    return r(false, 'hard', 'Enter a whole number of tiles.')
  const n = Number(tilesInput)
  if (isNaN(n) || !Number.isInteger(n))
    return r(false, 'hard', 'Tiles must be a whole number.')
  if (n < 2)
    return r(false, 'hard', 'You need at least 2 tiles to make a challenge.')
  if (n > 200)
    return { valid: true, type: 'soft', message: "That's a lot of tiles — are you sure? Most people do under 100.", value: n }
  return r(true, null, null, n)
}

export function validateTarget(targetInput) {
  if (!targetInput && targetInput !== 0)
    return r(false, 'hard', 'Enter a target amount.')
  const n = parseFloat(targetInput)
  if (isNaN(n))
    return r(false, 'hard', 'Enter a valid number for your target.')
  if (n <= 0)
    return r(false, 'hard', 'Target must be greater than zero.')
  return r(true, null, null, n)
}

export function validateAmounts(amounts) {
  if (!amounts || amounts.length === 0)
    return r(false, 'hard', 'No tile amounts yet.')
  if (amounts.length < 2)
    return r(false, 'hard', 'You need at least 2 tiles.')
  if (amounts.some(v => typeof v !== 'number' || isNaN(v) || v < 0.01))
    return r(false, 'hard', 'Each tile needs a value of at least 1p (or equivalent).')
  return r(true, null, null)
}

/**
 * Returns a soft hint when the per-tile amount would be below the minimum for the currency.
 * Returns null when no hint is needed.
 */
export function getAutoHint(tiles, target, precision = 2) {
  if (!tiles || !target) return null
  const minPerTile = Math.pow(10, -precision)
  if (target / tiles < minPerTile) {
    const minTarget = parseFloat((tiles * minPerTile).toFixed(precision))
    const suffix = precision === 0 ? '1' : '1p'
    return `Try £${minTarget} or more for ${tiles} tiles — each tile needs at least ${suffix}.`
  }
  return null
}
