# Custom Challenge Creator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Custom Challenge Creator wizard that lets users generate or manually define arbitrary tile-amount savings challenges, fully integrated with the existing ChallengeScreen, DashboardScreen, and AuthScreen.

**Architecture:** Full-screen wizard (`screen: 'custom-creator'`) using an isolated `useCreatorState` hook with sessionStorage draft persistence. Pure calculation and validation layers feed a 5-step UI. Custom challenges store tile amounts in `challenge_progress.tile_amounts` and are consumed by ChallengeScreen via a single `isCustom` conditional.

**Tech Stack:** React 18, Vite, Supabase JS v2, CSS custom properties (no new deps required).

**Spec:** `docs/superpowers/specs/2026-04-13-custom-challenge-creator-design.md`

---

## File Map

### New files
| Path | Responsibility |
|---|---|
| `src/utils/tileCalculations.js` | Pure generation functions (equal/ascending/descending/random), finalize, gridCols, parsePaste, fisherYates |
| `src/utils/tileCalculations.test.js` | Vitest unit tests for all calculation functions |
| `src/utils/creatorValidation.js` | Validation rules returning `{ valid, type, message, value }` |
| `src/utils/creatorValidation.test.js` | Vitest unit tests for all validators |
| `src/hooks/useCreatorState.js` | Isolated useReducer + sessionStorage draft persistence |
| `src/components/creator/CustomChallengeCreator.jsx` | Wizard shell: step router, back navigation, handleCreate |
| `src/components/creator/StepName.jsx` | Step 1 — name input |
| `src/components/creator/StepPicker.jsx` | Step 2 — templates + mode cards + upgrade gate |
| `src/components/creator/StepAutoBuilder.jsx` | Step 3a — tile count + target + spread → auto-generate |
| `src/components/creator/StepManualBuilder.jsx` | Step 3b — manual tile list + paste support |
| `src/components/creator/StepPreview.jsx` | Step 4 — tile grid preview + shuffle + confirm |
| `src/styles/creator.css` | All scoped creator styles |

### Modified files
| Path | Change |
|---|---|
| `src/context/AppContext.jsx` | Add `isPremium`, `creatorReturnTo`, `challenge.customAmounts`; new reducer cases |
| `src/utils/challengeConfigs.js` | Add `custom` config entry |
| `src/services/db.js` | Add `dbCreateCustomChallenge`; extend load queries to return `tile_amounts` |
| `src/pages/AppPage.jsx` | Render creator screen; load `isPremium` from profile on login; pass `customAmounts` on challenge load |
| `src/components/app/ChallengeScreen.jsx` | Add `isCustom` + `slotVal()` helper; add custom tile grid; fix all `config.slots`/`slotValue`/`gridCols` references |
| `src/components/app/DashboardScreen.jsx` | Add "+ Custom challenge" button; fix `totalSaved` + `openChallenge` for custom type; read `isPremium` |
| `src/components/app/AuthScreen.jsx` | Add Custom card to `panel-challenge`; dispatch to creator |
| `vite.config.js` | Add Vitest `test` block |

---

## Task 1: Supabase — add `is_pro` column

**Files:**
- Manual: Supabase dashboard SQL editor

- [ ] **Step 1: Run SQL in Supabase dashboard**

Go to your Supabase project → SQL Editor → run:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
```

- [ ] **Step 2: Verify column exists**

In Supabase → Table Editor → `profiles` table. Confirm `is_pro` column appears with default `false`.

- [ ] **Step 3: Set your own account to pro for testing**

In Table Editor, find your user row and set `is_pro = true`.

---

## Task 2: Vitest setup

**Files:**
- Modify: `vite.config.js`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

```bash
cd hellofinity-react
npm install -D vitest
```

Expected: vitest added to devDependencies in package.json.

- [ ] **Step 2: Add test config to vite.config.js**

Open `vite.config.js`. The file currently has `return { plugins: [...], server: { port: 5173 } }`.

Replace:
```js
    server: { port: 5173 },
  }
})
```
With:
```js
    server: { port: 5173 },
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
  }
})
```

- [ ] **Step 3: Add test script to package.json**

Open `package.json`. In the `"scripts"` section add:
```json
"test": "vitest run"
```

- [ ] **Step 4: Verify Vitest runs**

```bash
npm test
```

Expected output: `No test files found` (no tests yet — that's fine, it means Vitest is wired up correctly).

---

## Task 3: tileCalculations.js — TDD

**Files:**
- Create: `src/utils/tileCalculations.js`
- Create: `src/utils/tileCalculations.test.js`

- [ ] **Step 1: Write the test file**

Create `src/utils/tileCalculations.test.js`:

```js
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
```

- [ ] **Step 2: Run tests — expect ALL to fail**

```bash
npm test
```

Expected: errors like `Cannot find module './tileCalculations'`. That's correct — the implementation doesn't exist yet.

- [ ] **Step 3: Create `src/utils/tileCalculations.js`**

```js
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
  const sum = amounts.reduce((a, b) => a + b, 0)
  const diff = round(target - sum, precision)
  if (diff !== 0) {
    amounts[amounts.length - 1] = round(amounts[amounts.length - 1] + diff, precision)
  }
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
  // Shuffle a copy of the ascending result — keeps ascending as the base
  return fisherYates(generateAscending(n, total, precision))
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
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm test
```

Expected: all tests green. If any fail, fix the implementation before proceeding.

- [ ] **Step 5: Commit**

```bash
git add src/utils/tileCalculations.js src/utils/tileCalculations.test.js vite.config.js package.json
git commit -m "feat: add tileCalculations pure functions with Vitest"
```

---

## Task 4: creatorValidation.js — TDD

**Files:**
- Create: `src/utils/creatorValidation.js`
- Create: `src/utils/creatorValidation.test.js`

- [ ] **Step 1: Write the test file**

Create `src/utils/creatorValidation.test.js`:

```js
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
```

- [ ] **Step 2: Run tests — expect ALL to fail**

```bash
npm test
```

Expected: errors importing `./creatorValidation`. Correct.

- [ ] **Step 3: Create `src/utils/creatorValidation.js`**

```js
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
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm test
```

Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/creatorValidation.js src/utils/creatorValidation.test.js
git commit -m "feat: add creatorValidation with TDD"
```

---

## Task 5: AppContext — add new fields and reducer cases

**Files:**
- Modify: `src/context/AppContext.jsx`

- [ ] **Step 1: Add `isPremium`, `creatorReturnTo`, `customAmounts` to initialState**

In `src/context/AppContext.jsx`, find `const initialState = {` and make these additions:

```js
const initialState = {
  // Auth
  currentUser: null,
  isPremium:   false,          // ← ADD: loaded from profile.is_pro on login
  // Challenge
  challengeId: null,
  activeChallenges: [],
  challenge: {
    name: '',
    goal: '',
    multiplier: 1,
    challengeType: 'envelope_100',
    currency: 'GBP',
    envelopes: Array(100).fill(false),
    customAmounts: [],         // ← ADD: number[] for custom challenge tile values
    doneLog: [],
    highlightedEnv: null,
    startedAt: null,
  },
  // UI
  screen: 'loading',
  authPanel: 'panel-auth',
  creatorReturnTo: null,       // ← ADD: 'auth' | 'dashboard' — where to return after creator
  theme: localStorage.getItem('hf-theme') || 'light',
  // ... rest unchanged
}
```

- [ ] **Step 2: Add new reducer cases**

In the `reducer` function, add these two cases alongside the existing ones:

```js
case 'SET_IS_PREMIUM':        return { ...state, isPremium: action.payload }
case 'SET_CREATOR_RETURN_TO': return { ...state, creatorReturnTo: action.payload }
```

- [ ] **Step 3: Add `customAmounts: []` to RESET_CHALLENGE_DATA**

Find the `RESET_CHALLENGE_DATA` case and add `customAmounts: []` to the reset object:

```js
case 'RESET_CHALLENGE_DATA': {
  const config = CHALLENGE_CONFIGS[action.challengeType] || CHALLENGE_CONFIGS.envelope_100
  return {
    ...state,
    challenge: {
      name: '', goal: '',
      multiplier: 1,
      challengeType: action.challengeType || 'envelope_100',
      currency: 'GBP',
      envelopes: Array(config.slots).fill(false),
      customAmounts: [],      // ← ADD
      doneLog: [],
      highlightedEnv: null,
      startedAt: null,
    }
  }
}
```

- [ ] **Step 4: Verify dev server starts without errors**

```bash
npm run dev
```

Expected: server starts on port 5173, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/context/AppContext.jsx
git commit -m "feat: extend AppContext with isPremium, creatorReturnTo, customAmounts"
```

---

## Task 6: challengeConfigs.js — add `custom` type

**Files:**
- Modify: `src/utils/challengeConfigs.js`

- [ ] **Step 1: Add the `custom` entry**

Open `src/utils/challengeConfigs.js`. After the existing `day_365` entry, add:

```js
  custom: {
    type:            'custom',
    label:           'Custom Challenge',
    slots:           0,            // dynamic — set per challenge instance (use customAmounts.length)
    slotValue:       (i, _m, amounts) => amounts?.[i] ?? 0,
    totalFn:         (_m, amounts) => amounts?.reduce((s, v) => s + v, 0) ?? 0,
    gridCols:        10,           // overridden by gridCols() from tileCalculations.js
    slotLabel:       'tile',
    slotLabelPlural: 'tiles',
  },
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: `✓ built` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/challengeConfigs.js
git commit -m "feat: add custom challenge type to CHALLENGE_CONFIGS"
```

---

## Task 7: db.js — dbCreateCustomChallenge + extend load queries

**Files:**
- Modify: `src/services/db.js`

- [ ] **Step 1: Add `tile_amounts` to `dbLoadActiveChallenges` select**

Find this line in `dbLoadActiveChallenges`:
```js
             challenge_data:challenge_progress(progress, done_log)`)
```
Replace with:
```js
             challenge_data:challenge_progress(progress, done_log, tile_amounts)`)
```

- [ ] **Step 2: Add `tile_amounts` to `dbLoadArchivedChallenges` select**

Find this line in `dbLoadArchivedChallenges`:
```js
             challenge_data:challenge_progress(progress, done_log)`)
```
Replace with:
```js
             challenge_data:challenge_progress(progress, done_log, tile_amounts)`)
```

- [ ] **Step 3: Add `dbCreateCustomChallenge` function**

Add this function at the end of `src/services/db.js`, before the final export:

```js
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
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

Expected: `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/services/db.js
git commit -m "feat: add dbCreateCustomChallenge and extend load queries for tile_amounts"
```

---

## Task 8: useCreatorState.js hook

**Files:**
- Create: `src/hooks/useCreatorState.js`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useCreatorState.js`:

```js
import { useReducer, useEffect, useCallback } from 'react'

const DRAFT_VERSION = 1
const STORAGE_KEY   = 'hf-creator-draft'

export const initialCreatorState = {
  step:         'name',   // 'name' | 'picker' | 'auto' | 'manual' | 'preview'
  mode:         null,     // 'auto' | 'manual' | null

  name:         '',

  // Auto mode — dual representation keeps strings in UI, numbers in logic
  tilesInput:   '',       // raw string (what the input shows)
  targetInput:  '',       // raw string
  tiles:        null,     // validated number | null
  target:       null,     // validated number | null
  spread:       'equal',  // 'equal' | 'ascending' | 'descending' | 'random'

  // Single source of truth for tile values
  amounts:      [],       // number[] — committed valid values
  baseAmounts:  [],       // number[] — ascending-sorted; source for reshuffle; never mutated

  // Manual mode
  manualInputs:     [],   // string[] — editing state (may be invalid)
  previousAmounts:  [],   // number[] — one-level undo snapshot

  // Draft persistence metadata
  isDraft:      false,
  lastUpdated:  null,
  version:      DRAFT_VERSION,

  // Async state
  isCreating:   false,

  // Internal: draft banner
  hasDraft:     false,
}

function creatorReducer(state, action) {
  switch (action.type) {

    case 'SET_STEP':
      return { ...state, step: action.payload }

    case 'SET_MODE':
      return { ...state, mode: action.payload, isDraft: true }

    case 'SET_NAME':
      return { ...state, name: action.payload, isDraft: action.payload.length > 0 }

    case 'SET_TILES_INPUT': {
      const n = parseInt(action.payload, 10)
      const valid = !isNaN(n) && Number.isInteger(n) && n >= 2
      return { ...state, tilesInput: action.payload, tiles: valid ? n : null }
    }

    case 'SET_TARGET_INPUT': {
      const n = parseFloat(action.payload)
      return { ...state, targetInput: action.payload, target: (!isNaN(n) && n > 0) ? n : null }
    }

    case 'SET_SPREAD':
      return { ...state, spread: action.payload }

    case 'SET_AMOUNTS':
      return { ...state, amounts: action.payload, isDraft: true, lastUpdated: Date.now() }

    case 'SET_BASE_AMOUNTS':
      return { ...state, baseAmounts: action.payload }

    case 'SET_MANUAL_INPUTS':
      return { ...state, manualInputs: action.payload, isDraft: true }

    case 'UPDATE_MANUAL_INPUT': {
      const next = [...state.manualInputs]
      next[action.index] = action.value
      return { ...state, manualInputs: next, isDraft: true }
    }

    case 'ADD_MANUAL_TILE':
      return { ...state, manualInputs: [...state.manualInputs, ''], isDraft: true }

    case 'REMOVE_MANUAL_TILE': {
      const next = state.manualInputs.filter((_, i) => i !== action.index)
      return { ...state, manualInputs: next, isDraft: true }
    }

    case 'COMMIT_MANUAL_AMOUNTS': {
      return {
        ...state,
        previousAmounts: state.amounts,
        amounts: action.payload,
        lastUpdated: Date.now(),
      }
    }

    case 'UNDO':
      return { ...state, amounts: state.previousAmounts, previousAmounts: [] }

    case 'PASTE_AMOUNTS': {
      // action.payload is already a parsed number[] from parsePaste()
      const inputs = action.payload.map(v => String(v))
      return { ...state, manualInputs: inputs, isDraft: true }
    }

    case 'APPLY_TEMPLATE':
      return {
        ...state,
        name:        action.name,
        tilesInput:  String(action.tiles),
        targetInput: String(action.target),
        tiles:       action.tiles,
        target:      action.target,
        spread:      action.spread,
        mode:        'auto',
        isDraft:     true,
      }

    case 'SET_IS_CREATING':
      return { ...state, isCreating: action.payload }

    case 'DISMISS_DRAFT':
      return { ...state, hasDraft: false }

    case 'RESET':
      return { ...initialCreatorState }

    default:
      return state
  }
}

function isValidDraft(draft) {
  return (
    draft != null &&
    draft.version === DRAFT_VERSION &&
    typeof draft.name === 'string' &&
    Array.isArray(draft.amounts)
  )
}

export function useCreatorState() {
  const [state, dispatch] = useReducer(
    creatorReducer,
    initialCreatorState,
    (init) => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (isValidDraft(parsed)) {
            return { ...init, ...parsed, isCreating: false, hasDraft: true }
          }
        }
      } catch (_) {
        // Corrupt draft — discard silently
        sessionStorage.removeItem(STORAGE_KEY)
      }
      return { ...init, hasDraft: false }
    }
  )

  // Persist draft on every state change — debounced 500ms
  useEffect(() => {
    if (!state.isDraft) return
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch (_) {}
    }, 500)
    return () => clearTimeout(timer)
  }, [state])

  const reset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    dispatch({ type: 'RESET' })
  }, [])

  return { state, dispatch, reset }
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCreatorState.js
git commit -m "feat: add useCreatorState isolated reducer with sessionStorage draft persistence"
```

---

## Task 9: creator.css

**Files:**
- Create: `src/styles/creator.css`

- [ ] **Step 1: Create the stylesheet**

Create `src/styles/creator.css`:

```css
/* ══════════════════════════════════════
   CUSTOM CHALLENGE CREATOR
   All classes prefixed with creator- or
   use existing app.css form-input/btn classes
══════════════════════════════════════ */

/* ── Shell ── */
.creator-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

/* ── Header ── */
.creator-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 0.5px solid var(--border-md);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 10;
  transition: background 0.25s, border-color 0.25s;
}
.creator-back {
  background: none; border: none;
  cursor: pointer; font-size: 13px; font-weight: 600;
  color: var(--muted); padding: 4px 0;
  transition: color 0.15s; font-family: var(--font-sans);
}
.creator-back:hover { color: var(--text); }
.creator-header-title {
  font-size: 13px; font-weight: 700; color: var(--text);
}
.creator-progress {
  display: flex; gap: 5px; align-items: center;
}
.creator-progress-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--border-md); transition: background 0.2s;
}
.creator-progress-dot.active { background: var(--brand-accent); }

/* ── Body (scrollable content) ── */
.creator-body {
  flex: 1;
  padding: 24px 20px 120px;   /* bottom pad for sticky footer */
  max-width: 520px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
.creator-title {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 24px; color: var(--text);
  letter-spacing: -0.01em; margin-bottom: 6px;
}
.creator-subtitle {
  font-size: 13px; color: var(--muted);
  line-height: 1.55; margin-bottom: 24px;
}
.creator-section-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--hint); margin-bottom: 8px; margin-top: 20px;
}

/* ── Draft restore banner ── */
.creator-draft-banner {
  background: rgba(245,200,66,0.12);
  border: 1px solid rgba(245,200,66,0.35);
  border-radius: 10px; padding: 12px 14px;
  margin-bottom: 16px;
  display: flex; align-items: center;
  justify-content: space-between; gap: 8px;
}
.creator-draft-text { font-size: 13px; color: var(--text); line-height: 1.4; }
.creator-draft-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* ── Templates ── */
.template-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px; margin-bottom: 16px;
}
.template-card {
  background: var(--surface); border: 1px solid var(--border-md);
  border-radius: 12px; padding: 14px;
  cursor: pointer; transition: all 0.15s;
  position: relative; text-align: left;
  font-family: var(--font-sans);
}
.template-card:hover { border-color: var(--brand-accent); background: var(--surface2); }
.template-card.locked { opacity: 0.6; }
.template-card-icon { font-size: 22px; margin-bottom: 6px; }
.template-card-name { font-size: 13px; font-weight: 700; color: var(--text); }
.template-card-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
.template-lock { position: absolute; top: 10px; right: 10px; font-size: 12px; color: var(--hint); }

/* ── Mode cards ── */
.mode-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.mode-card {
  background: var(--surface); border: 1.5px solid var(--border-md);
  border-radius: 14px; padding: 16px;
  cursor: pointer; display: flex; align-items: center;
  gap: 14px; transition: all 0.15s; font-family: var(--font-sans);
  text-align: left;
}
.mode-card:hover { border-color: var(--brand-accent); }
.mode-card.locked { opacity: 0.6; }
.mode-card-icon { font-size: 24px; flex-shrink: 0; }
.mode-card-title { font-size: 14px; font-weight: 700; color: var(--text); }
.mode-card-desc { font-size: 12px; color: var(--muted); margin-top: 2px; line-height: 1.4; }
.mode-card-lock { margin-left: auto; color: var(--hint); flex-shrink: 0; }

/* ── Spread selector ── */
.spread-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 8px; margin-bottom: 20px;
}
.spread-option {
  background: var(--surface2); border: 1.5px solid transparent;
  border-radius: 10px; padding: 10px 12px;
  cursor: pointer; text-align: center; transition: all 0.15s;
  font-family: var(--font-sans);
}
.spread-option:hover { border-color: var(--border-md); }
.spread-option.selected { border-color: var(--brand-accent); background: var(--surface); }
.spread-option-name { font-size: 13px; font-weight: 700; color: var(--text); }
.spread-option-desc { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* ── Auto generate result area ── */
.creator-generate-result {
  background: var(--surface2); border-radius: 12px;
  padding: 16px; margin-top: 16px; text-align: center;
}

/* ── Manual tile list ── */
.manual-tile-list {
  display: flex; flex-direction: column; gap: 8px;
  margin-bottom: 12px; max-height: 45vh; overflow-y: auto;
}
.manual-tile-row { display: flex; align-items: center; gap: 8px; }
.manual-tile-num {
  font-size: 11px; color: var(--hint);
  width: 22px; flex-shrink: 0; text-align: right;
}
.manual-tile-input { flex: 1; }
.manual-tile-remove {
  background: none; border: none; cursor: pointer;
  color: var(--hint); font-size: 20px; line-height: 1;
  padding: 4px 6px; transition: color 0.15s; flex-shrink: 0;
  font-family: var(--font-sans);
}
.manual-tile-remove:hover { color: #e04c2f; }
.manual-add-btn {
  width: 100%; padding: 10px;
  border: 1.5px dashed var(--border-md); border-radius: 10px;
  background: none; color: var(--muted); font-size: 13px;
  cursor: pointer; transition: all 0.15s; font-family: var(--font-sans);
}
.manual-add-btn:hover { border-color: var(--brand-accent); color: var(--text); }
.manual-total-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0; border-top: 0.5px solid var(--border-md); margin-top: 8px;
}
.manual-total-label { font-size: 12px; color: var(--muted); }
.manual-total-value { font-size: 16px; font-weight: 700; color: var(--text); }

/* ── Preview ── */
.preview-stats {
  display: flex; justify-content: space-between;
  align-items: flex-start; margin-bottom: 20px;
}
.preview-total {
  font-family: var(--font-serif);
  font-size: 36px; color: var(--text); letter-spacing: -0.02em;
}
.preview-total-label { font-size: 11px; color: var(--muted); margin-top: 2px; }
.preview-count { text-align: right; }
.preview-count-num { font-size: 24px; font-weight: 700; color: var(--text); }
.preview-count-label { font-size: 11px; color: var(--muted); margin-top: 2px; }

.preview-grid { display: grid; gap: 6px; margin-bottom: 20px; }
.preview-tile {
  background: var(--surface); border: 1px solid var(--border-md);
  border-radius: 8px; padding: 8px 4px; text-align: center;
  font-size: 11px; font-weight: 600; color: var(--text);
  transition: transform 0.1s; min-height: 36px;
  display: flex; align-items: center; justify-content: center;
}
.preview-tile:hover { transform: scale(1.06); }

/* ── Upgrade prompt ── */
.upgrade-prompt {
  background: var(--surface2); border: 1px solid var(--border-md);
  border-radius: 14px; padding: 20px; text-align: center; margin-top: 20px;
}
.upgrade-prompt-icon { font-size: 28px; margin-bottom: 8px; }
.upgrade-prompt-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.upgrade-prompt-sub {
  font-size: 13px; color: var(--muted);
  line-height: 1.5; margin-bottom: 16px;
}

/* ── Sticky footer ── */
.creator-footer {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 14px 20px; background: var(--surface);
  border-top: 0.5px solid var(--border-md);
  z-index: 10; transition: background 0.25s, border-color 0.25s;
}
@media (min-width: 560px) {
  .creator-footer {
    position: sticky;     /* desktop: footer sticks to bottom of content, not viewport */
    max-width: 520px; margin: 0 auto;
  }
}

/* ── Inline hints ── */
.creator-hint {
  font-size: 12px; color: var(--brand-accent);
  margin-top: 5px; margin-bottom: 4px; line-height: 1.4;
}
.creator-hint-error {
  font-size: 12px; color: #c0392b;
  margin-top: 5px; margin-bottom: 4px; line-height: 1.4;
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/creator.css
git commit -m "feat: add creator.css scoped styles"
```

---

## Task 10: StepName.jsx

**Files:**
- Create: `src/components/creator/StepName.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { validateName } from '../../utils/creatorValidation'

export default function StepName({ state, dispatch, onNext }) {
  const validation = validateName(state.name)

  return (
    <div className="creator-body">
      <div className="creator-title">Name your challenge.</div>
      <div className="creator-subtitle">
        This appears on your dashboard and progress cards.
      </div>

      <label className="form-label">Challenge name</label>
      <input
        className="form-input"
        type="text"
        placeholder="e.g. Holiday Fund, New Car, Rainy Day"
        autoFocus
        maxLength={60}
        autoComplete="off"
        value={state.name}
        onChange={e => dispatch({ type: 'SET_NAME', payload: e.target.value })}
        onKeyDown={e => e.key === 'Enter' && validation.valid && onNext()}
      />
      {state.name && !validation.valid && (
        <div className="creator-hint-error">{validation.message}</div>
      )}

      <div className="creator-footer">
        <button
          className="btn-primary btn-full"
          onClick={onNext}
          disabled={!validation.valid}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/creator/StepName.jsx
git commit -m "feat: add StepName component"
```

---

## Task 11: StepPicker.jsx

**Files:**
- Create: `src/components/creator/StepPicker.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState } from 'react'
import { generateAmounts } from '../../utils/tileCalculations'
import CheckoutModal from '../landing/CheckoutModal'

const TEMPLATES = [
  { id: 'holiday',   icon: '✈️', name: 'Holiday Fund',      sub: '12 tiles · £1,200', tiles: 12, target: 1200, spread: 'equal'     },
  { id: 'christmas', icon: '🎄', name: 'Christmas Savings', sub: '10 tiles · £500',   tiles: 10, target: 500,  spread: 'ascending'  },
  { id: 'emergency', icon: '🛡️', name: 'Emergency Fund',    sub: '6 tiles · £3,000',  tiles: 6,  target: 3000, spread: 'equal'     },
  { id: 'payday',    icon: '💰', name: 'Payday Challenge',  sub: '4 tiles · £400',    tiles: 4,  target: 400,  spread: 'equal'      },
]

export default function StepPicker({ state, dispatch, isPremium, precision, onNext }) {
  const [showCheckout, setShowCheckout] = useState(false)

  function handleTemplate(t) {
    if (!isPremium) { setShowCheckout(true); return }
    const amounts = generateAmounts(t.tiles, t.target, t.spread, precision)
    // For random: ascending is baseAmounts; otherwise amounts === baseAmounts
    const base = [...amounts].sort((a, b) => a - b)
    dispatch({ type: 'APPLY_TEMPLATE', name: t.name, tiles: t.tiles, target: t.target, spread: t.spread })
    dispatch({ type: 'SET_AMOUNTS',      payload: amounts })
    dispatch({ type: 'SET_BASE_AMOUNTS', payload: base    })
    dispatch({ type: 'SET_STEP',         payload: 'preview' })
  }

  function handleMode(mode) {
    if (!isPremium) { setShowCheckout(true); return }
    dispatch({ type: 'SET_MODE', payload: mode })
    onNext(mode)   // passes 'auto' or 'manual' — shell routes to correct step
  }

  return (
    <div className="creator-body">
      <div className="creator-title">How do you want to build it?</div>
      <div className="creator-subtitle">
        Start from a template or build your own from scratch.
      </div>

      <div className="creator-section-label">Start from a template</div>
      <div className="template-grid">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            className={`template-card${!isPremium ? ' locked' : ''}`}
            onClick={() => handleTemplate(t)}
          >
            <div className="template-card-icon">{t.icon}</div>
            <div className="template-card-name">{t.name}</div>
            <div className="template-card-sub">{t.sub}</div>
            {!isPremium && <span className="template-lock">🔒</span>}
          </button>
        ))}
      </div>

      <div className="creator-section-label">Build your own</div>
      <div className="mode-grid">
        <button
          className={`mode-card${!isPremium ? ' locked' : ''}`}
          onClick={() => handleMode('auto')}
        >
          <div className="mode-card-icon">⚙️</div>
          <div className="mode-card-text">
            <div className="mode-card-title">Build it for me</div>
            <div className="mode-card-desc">Enter a tile count and target — we'll generate the amounts.</div>
          </div>
          {!isPremium && <span className="mode-card-lock">🔒</span>}
        </button>

        <button
          className={`mode-card${!isPremium ? ' locked' : ''}`}
          onClick={() => handleMode('manual')}
        >
          <div className="mode-card-icon">✏️</div>
          <div className="mode-card-text">
            <div className="mode-card-title">I'll build it myself</div>
            <div className="mode-card-desc">Enter each tile amount manually. Paste a list to import quickly.</div>
          </div>
          {!isPremium && <span className="mode-card-lock">🔒</span>}
        </button>
      </div>

      {!isPremium && (
        <div className="upgrade-prompt">
          <div className="upgrade-prompt-icon">⭐</div>
          <div className="upgrade-prompt-title">Custom challenges are a Pro feature</div>
          <div className="upgrade-prompt-sub">
            Upgrade to Day One to unlock custom challenges, unlimited tiles, and every future feature — one payment, forever.
          </div>
          <button className="btn-primary btn-full" onClick={() => setShowCheckout(true)}>
            Get Day One → £12.99
          </button>
        </div>
      )}

      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/creator/StepPicker.jsx
git commit -m "feat: add StepPicker with templates, mode cards, and upgrade gate"
```

---

## Task 12: StepAutoBuilder.jsx

**Files:**
- Create: `src/components/creator/StepAutoBuilder.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState } from 'react'
import { generateAmounts } from '../../utils/tileCalculations'
import { validateTiles, validateTarget, getAutoHint } from '../../utils/creatorValidation'
import { fmt } from '../../utils/formatters'

const SPREADS = [
  { id: 'equal',      name: 'Equal',      desc: 'Same amount every tile'  },
  { id: 'ascending',  name: 'Ascending',  desc: 'Smallest to largest'     },
  { id: 'descending', name: 'Descending', desc: 'Largest to smallest'     },
  { id: 'random',     name: 'Random',     desc: 'Shuffled amounts'         },
]

export default function StepAutoBuilder({ state, dispatch, precision, currency, onNext }) {
  const [generated, setGenerated] = useState(state.amounts.length > 0)

  const tilesV  = validateTiles(state.tilesInput)
  const targetV = validateTarget(state.targetInput)
  // Trigger only when BOTH tiles AND target are valid numbers (spread is not a trigger condition)
  const canGenerate = tilesV.valid && targetV.valid && state.tiles !== null && state.target !== null
  const hint = getAutoHint(state.tiles, state.target, precision)

  function handleGenerate() {
    if (!canGenerate) return
    const amounts = generateAmounts(state.tiles, state.target, state.spread, precision)
    // baseAmounts = ascending sort (source for reshuffle if spread === 'random')
    const base = state.spread === 'random'
      ? generateAmounts(state.tiles, state.target, 'ascending', precision)
      : [...amounts]
    dispatch({ type: 'SET_AMOUNTS',      payload: amounts })
    dispatch({ type: 'SET_BASE_AMOUNTS', payload: base    })
    setGenerated(true)
  }

  const canProceed = generated && state.amounts.length > 0

  return (
    <div className="creator-body">
      <div className="creator-title">Build it for me.</div>
      <div className="creator-subtitle">
        Fill in the tile count and your target total, then choose how to spread the amounts.
      </div>

      <label className="form-label">Number of tiles</label>
      <input
        className={`form-input${state.tilesInput && !tilesV.valid ? ' input-error' : ''}`}
        type="number" min="2" max="200" step="1"
        placeholder="e.g. 12"
        value={state.tilesInput}
        onChange={e => dispatch({ type: 'SET_TILES_INPUT', payload: e.target.value })}
      />
      {state.tilesInput && tilesV.message && (
        <div className={tilesV.type === 'soft' ? 'creator-hint' : 'creator-hint-error'}>
          {tilesV.message}
        </div>
      )}

      <label className="form-label" style={{ marginTop: 16 }}>Target total</label>
      <input
        className={`form-input${state.targetInput && !targetV.valid ? ' input-error' : ''}`}
        type="number" min="0.01" step="0.01"
        placeholder="e.g. 1200"
        value={state.targetInput}
        onChange={e => dispatch({ type: 'SET_TARGET_INPUT', payload: e.target.value })}
      />
      {state.targetInput && targetV.message && (
        <div className={targetV.type === 'soft' ? 'creator-hint' : 'creator-hint-error'}>
          {targetV.message}
        </div>
      )}
      {hint && <div className="creator-hint">{hint}</div>}

      <div className="creator-section-label">Spread</div>
      <div className="spread-grid">
        {SPREADS.map(s => (
          <button
            key={s.id}
            className={`spread-option${state.spread === s.id ? ' selected' : ''}`}
            onClick={() => dispatch({ type: 'SET_SPREAD', payload: s.id })}
          >
            <div className="spread-option-name">{s.name}</div>
            <div className="spread-option-desc">{s.desc}</div>
          </button>
        ))}
      </div>

      {generated && state.amounts.length > 0 && (
        <div className="creator-generate-result">
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
            Generated {state.amounts.length} tiles
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
            {fmt(state.amounts.reduce((s, v) => s + v, 0), currency)} total
          </div>
        </div>
      )}

      <div className="creator-footer" style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn-secondary"
          style={{ flex: 1 }}
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          {generated ? 'Regenerate' : 'Generate →'}
        </button>
        {canProceed && (
          <button className="btn-primary" style={{ flex: 2 }} onClick={onNext}>
            Preview →
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/creator/StepAutoBuilder.jsx
git commit -m "feat: add StepAutoBuilder with dual-field trigger and spread selection"
```

---

## Task 13: StepManualBuilder.jsx

**Files:**
- Create: `src/components/creator/StepManualBuilder.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState } from 'react'
import { parsePaste } from '../../utils/tileCalculations'
import { validateAmounts } from '../../utils/creatorValidation'
import { fmt } from '../../utils/formatters'

export default function StepManualBuilder({ state, dispatch, currency, onNext }) {
  const [pasteHint, setPasteHint] = useState('')

  function commitAmounts() {
    const committed = state.manualInputs
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v) && v >= 0.01)
    dispatch({ type: 'COMMIT_MANUAL_AMOUNTS', payload: committed })
  }

  function handlePaste(e) {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const parsed = parsePaste(text)   // single pass, returns number[]
    if (parsed.length === 0) {
      setPasteHint("None of those looked like valid amounts. Try numbers separated by commas.")
      return
    }
    setPasteHint('')
    dispatch({ type: 'PASTE_AMOUNTS', payload: parsed })   // single dispatch
  }

  function handleSwitchToAuto() {
    if (!window.confirm('This will replace your tiles with generated amounts. Continue?')) return
    dispatch({ type: 'SET_MODE', payload: 'auto' })
    dispatch({ type: 'SET_STEP', payload: 'auto' })
  }

  const liveTotal = state.manualInputs.reduce((s, v) => {
    const n = parseFloat(v)
    return s + (isNaN(n) ? 0 : n)
  }, 0)

  const committed = state.manualInputs.map(v => parseFloat(v)).filter(v => !isNaN(v) && v >= 0.01)
  const validation = validateAmounts(committed)
  const canProceed = validation.valid

  return (
    <div className="creator-body">
      <div className="creator-title">Build it yourself.</div>
      <div className="creator-subtitle">
        Add tiles one by one, or paste a comma-separated list to import all at once.
      </div>

      <label className="form-label">
        Paste amounts <span className="form-optional">(optional)</span>
      </label>
      <textarea
        className="form-input"
        rows={2}
        placeholder="e.g. 10, 25, 50, 100 — or one per line"
        onPaste={handlePaste}
        style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
        readOnly
      />
      {pasteHint && <div className="creator-hint-error">{pasteHint}</div>}

      <div className="creator-section-label" style={{ marginTop: 16 }}>
        Tiles ({state.manualInputs.length})
      </div>

      <div className="manual-tile-list">
        {state.manualInputs.map((val, i) => (
          <div key={i} className="manual-tile-row">
            <span className="manual-tile-num">{i + 1}</span>
            <input
              className={`form-input manual-tile-input${val !== '' && parseFloat(val) < 0.01 ? ' input-error' : ''}`}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={val}
              onChange={e => dispatch({ type: 'UPDATE_MANUAL_INPUT', index: i, value: e.target.value })}
              onBlur={commitAmounts}
              aria-label={`Tile ${i + 1} amount`}
            />
            <button
              className="manual-tile-remove"
              aria-label={`Remove tile ${i + 1}`}
              onClick={() => dispatch({ type: 'REMOVE_MANUAL_TILE', index: i })}
            >×</button>
          </div>
        ))}
      </div>

      <button
        className="manual-add-btn"
        onClick={() => dispatch({ type: 'ADD_MANUAL_TILE' })}
      >
        + Add tile
      </button>

      <div className="manual-total-bar">
        <span className="manual-total-label">
          {state.manualInputs.length} tiles · live total
        </span>
        <span className="manual-total-value">{fmt(liveTotal, currency)}</span>
      </div>

      {state.manualInputs.length >= 2 && !canProceed && (
        <div className="creator-hint-error">Each tile needs a value of at least 1p.</div>
      )}

      {state.previousAmounts.length > 0 && (
        <button
          className="forgot-link"
          style={{ textAlign: 'left', marginBottom: 8 }}
          onClick={() => dispatch({ type: 'UNDO' })}
        >
          ↩ Undo last change
        </button>
      )}

      <button
        className="forgot-link"
        style={{ textAlign: 'left' }}
        onClick={handleSwitchToAuto}
      >
        Switch to auto-generate instead
      </button>

      <div className="creator-footer">
        <button
          className="btn-primary btn-full"
          onClick={() => { commitAmounts(); onNext() }}
          disabled={!canProceed}
        >
          Preview →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/creator/StepManualBuilder.jsx
git commit -m "feat: add StepManualBuilder with paste support, undo, and live total"
```

---

## Task 14: StepPreview.jsx

**Files:**
- Create: `src/components/creator/StepPreview.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { fmt, fmtCompact } from '../../utils/formatters'
import { gridCols, fisherYates } from '../../utils/tileCalculations'

export default function StepPreview({ state, dispatch, currency, isCreating, onEdit, onCreate }) {
  const { amounts, baseAmounts, spread } = state
  const total = amounts.reduce((s, v) => s + v, 0)
  const cols  = gridCols(amounts.length)

  function handleShuffle() {
    // Reshuffle from baseAmounts — never mutates base
    const reshuffled = fisherYates([...baseAmounts])
    dispatch({ type: 'SET_AMOUNTS', payload: reshuffled })
  }

  return (
    <div className="creator-body">
      <div className="creator-title">Looking good.</div>
      <div className="creator-subtitle">
        Review your tiles, then create your challenge. You can edit it anytime.
      </div>

      <div className="preview-stats">
        <div>
          <div className="preview-total">{fmt(total, currency)}</div>
          <div className="preview-total-label">total to save</div>
        </div>
        <div className="preview-count">
          <div className="preview-count-num">{amounts.length}</div>
          <div className="preview-count-label">tiles</div>
        </div>
      </div>

      <div
        className="preview-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {amounts.map((v, i) => (
          <div key={i} className="preview-tile">
            {fmtCompact(v, currency)}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {spread === 'random' && (
          <button className="btn-secondary" style={{ flex: 1 }} onClick={handleShuffle}>
            🎲 Shuffle
          </button>
        )}
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onEdit}>
          ✏️ Edit tiles
        </button>
      </div>

      <div className="creator-footer">
        <button
          className="btn-primary btn-full"
          onClick={onCreate}
          disabled={isCreating}
        >
          {isCreating
            ? <><span className="co-spinner" style={{ marginRight: 8 }} /> Creating…</>
            : 'Create challenge →'
          }
        </button>
        {!isCreating && (
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--hint)' }}>
            Tap "Edit tiles" to make changes before creating.
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/creator/StepPreview.jsx
git commit -m "feat: add StepPreview with tile grid, shuffle, and confirm"
```

---

## Task 15: CustomChallengeCreator.jsx — wizard shell

**Files:**
- Create: `src/components/creator/CustomChallengeCreator.jsx`

- [ ] **Step 1: Create the shell component**

```jsx
import { useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { useCreatorState } from '../../hooks/useCreatorState'
import { useToast } from '../../hooks/useToast'
import { dbCreateCustomChallenge, dbWriteEvent } from '../../services/db'
import { CURRENCIES } from '../../utils/challengeConfigs'
import StepName from './StepName'
import StepPicker from './StepPicker'
import StepAutoBuilder from './StepAutoBuilder'
import StepManualBuilder from './StepManualBuilder'
import StepPreview from './StepPreview'
import '../../styles/creator.css'

// Step order used for progress dots and back navigation
const STEP_ORDER_AUTO   = ['name', 'picker', 'auto',   'preview']
const STEP_ORDER_MANUAL = ['name', 'picker', 'manual', 'preview']

export default function CustomChallengeCreator() {
  const { state: appState, dispatch: appDispatch } = useApp()
  const { state, dispatch, reset } = useCreatorState()
  const { showToast } = useToast()

  const { currentUser, creatorReturnTo, challenge, activeChallenges, isPremium } = appState
  const currency  = challenge.currency || 'GBP'
  const precision = CURRENCIES[currency]?.decimals ?? 2

  // Log creator_opened once on mount
  useEffect(() => {
    if (currentUser) {
      dbWriteEvent(null, currentUser.id, 'creator_opened', null, null)
    }
  }, [])

  // ── Navigation helpers ───────────────────────────────────────────────────

  const stepOrder = state.mode === 'manual' ? STEP_ORDER_MANUAL : STEP_ORDER_AUTO
  const stepIdx   = stepOrder.indexOf(state.step)

  function goBack() {
    if (stepIdx <= 0) {
      // Back to wherever the user came from
      if (state.isDraft && currentUser) {
        dbWriteEvent(null, currentUser.id, 'creator_abandoned', null, { step: state.step })
      }
      appDispatch({ type: 'SET_SCREEN', payload: creatorReturnTo || 'dashboard' })
    } else {
      dispatch({ type: 'SET_STEP', payload: stepOrder[stepIdx - 1] })
    }
  }

  // ── Create challenge ─────────────────────────────────────────────────────

  async function handleCreate() {
    if (!currentUser || state.isCreating) return
    dispatch({ type: 'SET_IS_CREATING', payload: true })

    try {
      const ch = await dbCreateCustomChallenge(
        currentUser.id,
        state.name.trim(),
        state.amounts,
        currency,
        state.spread,
        state.mode,
      )
      if (!ch) throw new Error('dbCreateCustomChallenge returned null')

      dbWriteEvent(ch.id, currentUser.id, 'creator_challenge_created', null, {
        tiles: state.amounts.length,
        total: state.amounts.reduce((s, v) => s + v, 0),
        mode:  state.mode,
      })

      // Build the challenge object for AppContext
      const newChallenge = {
        name:          appState.challenge.name || 'there',
        goal:          state.name.trim(),
        multiplier:    1,
        challengeType: 'custom',
        currency,
        envelopes:     Array(state.amounts.length).fill(false),
        customAmounts: state.amounts,
        doneLog:       [],
        highlightedEnv: null,
        startedAt:     ch.started_at,
      }

      // Attach challenge_data so DashboardScreen can read tile_amounts immediately
      ch.challenge_data = [{
        progress:     newChallenge.envelopes,
        done_log:     [],
        tile_amounts: state.amounts,
      }]

      appDispatch({ type: 'SET_CHALLENGE_ID',     payload: ch.id })
      appDispatch({ type: 'SET_CHALLENGE',         payload: newChallenge })
      appDispatch({ type: 'SET_ACTIVE_CHALLENGES', payload: [...activeChallenges, ch] })
      appDispatch({ type: 'SET_CELEBRATION',       challengeId: ch.id, payload: false })
      appDispatch({ type: 'SET_MILESTONES',        challengeId: ch.id, payload: new Set() })

      reset()   // clears sessionStorage draft
      appDispatch({ type: 'SET_SCREEN', payload: 'app' })
      showToast('Your custom challenge is ready! 🎉')
    } catch (err) {
      console.error('handleCreate error:', err.message)
      dispatch({ type: 'SET_IS_CREATING', payload: false })
      showToast("Something went wrong. Tap 'Create challenge' to try again.")
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="creator-screen">

      {/* Header with back + progress dots */}
      <div className="creator-header">
        <button className="creator-back" onClick={goBack} aria-label="Go back">
          ← Back
        </button>
        <div className="creator-progress">
          {stepOrder.map((s, i) => (
            <div
              key={s}
              className={`creator-progress-dot${i <= stepIdx ? ' active' : ''}`}
            />
          ))}
        </div>
        <div className="creator-header-title">Custom Challenge</div>
      </div>

      {/* Draft restore banner */}
      {state.hasDraft && state.step === 'name' && (
        <div style={{ padding: '12px 20px' }}>
          <div className="creator-draft-banner">
            <div className="creator-draft-text">
              You have an unfinished challenge. Continue where you left off?
            </div>
            <div className="creator-draft-actions">
              <button
                className="btn-secondary"
                style={{ fontSize: 12, padding: '6px 10px' }}
                onClick={() => { reset(); }}
              >
                Start fresh
              </button>
              <button
                className="btn-primary"
                style={{ fontSize: 12, padding: '6px 10px' }}
                onClick={() => dispatch({ type: 'DISMISS_DRAFT' })}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Steps */}
      {state.step === 'name' && (
        <StepName
          state={state}
          dispatch={dispatch}
          onNext={() => dispatch({ type: 'SET_STEP', payload: 'picker' })}
        />
      )}

      {state.step === 'picker' && (
        <StepPicker
          state={state}
          dispatch={dispatch}
          isPremium={isPremium}
          precision={precision}
          onNext={mode => dispatch({ type: 'SET_STEP', payload: mode })}
        />
      )}

      {state.step === 'auto' && (
        <StepAutoBuilder
          state={state}
          dispatch={dispatch}
          precision={precision}
          currency={currency}
          onNext={() => dispatch({ type: 'SET_STEP', payload: 'preview' })}
        />
      )}

      {state.step === 'manual' && (
        <StepManualBuilder
          state={state}
          dispatch={dispatch}
          currency={currency}
          onNext={() => dispatch({ type: 'SET_STEP', payload: 'preview' })}
        />
      )}

      {state.step === 'preview' && (
        <StepPreview
          state={state}
          dispatch={dispatch}
          currency={currency}
          isCreating={state.isCreating}
          onEdit={() => {
            // Copy amounts → manualInputs and switch to manual step
            dispatch({ type: 'SET_MANUAL_INPUTS', payload: state.amounts.map(v => String(v)) })
            dispatch({ type: 'SET_MODE',          payload: 'manual' })
            dispatch({ type: 'SET_STEP',          payload: 'manual' })
          }}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/components/creator/CustomChallengeCreator.jsx
git commit -m "feat: add CustomChallengeCreator wizard shell"
```

---

## Task 16: AppPage.jsx — render creator screen + load isPremium + pass customAmounts

**Files:**
- Modify: `src/pages/AppPage.jsx`

- [ ] **Step 1: Import CustomChallengeCreator**

At the top of `src/pages/AppPage.jsx`, after the existing imports add:

```js
import CustomChallengeCreator from '../components/creator/CustomChallengeCreator'
```

- [ ] **Step 2: Render the creator screen**

In the JSX return, inside the `{screen !== 'loading' && ( <> ... </> )}` block, add:

```jsx
{screen === 'custom-creator' && <CustomChallengeCreator />}
```

Place it alongside the existing screen conditionals:
```jsx
<AuthScreen visible={screen === 'auth'} onLoaded={loadExistingUser} />
{screen === 'dashboard'      && <DashboardScreen visible={true} />}
{screen === 'app'            && <ChallengeScreen visible={true} />}
{screen === 'custom-creator' && <CustomChallengeCreator />}        {/* ← ADD */}
{screen === 'privacy'        && <PrivacyScreen />}
{screen === 'terms'          && <TermsScreen />}
```

- [ ] **Step 3: Load isPremium in loadExistingUser**

In the `loadExistingUser` function, the line that reads:
```js
const profile = await dbUpsertProfile(user.id, {})
```
Add the dispatch immediately after it:
```js
const profile = await dbUpsertProfile(user.id, {})
dispatch({ type: 'SET_IS_PREMIUM', payload: profile?.is_pro === true })   // ← ADD
```

- [ ] **Step 4: Pass customAmounts when loading existing challenge**

In `loadExistingUser`, find the `dispatch({ type: 'SET_CHALLENGE', payload: { ... } })` block and add `customAmounts`:

```js
dispatch({
  type: 'SET_CHALLENGE',
  payload: {
    name:          profile?.name || 'there',
    goal:          ch.goal_label || '',
    multiplier:    ch.multiplier || 1,
    challengeType: ch.type || 'envelope_100',
    currency:      ch.currency || profile?.currency || 'GBP',
    envelopes:     cd.progress || Array(cfg.slots).fill(false),
    customAmounts: cd.tile_amounts || [],    // ← ADD
    doneLog:       cd.done_log || [],
    highlightedEnv: null,
    startedAt:     ch.started_at,
  },
})
```

- [ ] **Step 5: Verify dev server**

```bash
npm run dev
```

Open `localhost:5173/app`. Navigate to app. No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AppPage.jsx
git commit -m "feat: render CustomChallengeCreator screen, load isPremium and customAmounts"
```

---

## Task 17: ChallengeScreen.jsx — custom challenge support

**Files:**
- Modify: `src/components/app/ChallengeScreen.jsx`

- [ ] **Step 1: Import gridCols**

At the top of `ChallengeScreen.jsx`, add to the existing utils import:

```js
import { gridCols as customGridCols } from '../../utils/tileCalculations'
```

- [ ] **Step 2: Add isCustom derived constants after existing config line**

Find the block:
```js
const config = CHALLENGE_CONFIGS[challenge.challengeType] || CHALLENGE_CONFIGS.envelope_100
const m = challenge.multiplier
const currency = challenge.currency
```

Add directly below:
```js
const isCustom      = challenge.challengeType === 'custom'
const customAmounts = isCustom ? (challenge.customAmounts || []) : []
const totalSlots    = isCustom ? customAmounts.length : config.slots

// Helper: returns this tile's monetary value, routing custom vs formula-based
function slotVal(i) {
  return isCustom ? (customAmounts[i] ?? 0) : config.slotValue(i, m)
}
```

- [ ] **Step 3: Fix saved, total, remaining, pct**

Replace:
```js
const done = challenge.envelopes.filter(Boolean).length
const saved = challenge.envelopes.reduce((s, v, i) => v ? s + config.slotValue(i, m) : s, 0)
const total = config.totalFn(m)
const remaining = total - saved
const pct = config.slots > 0 ? Math.round(done / config.slots * 100) : 0
```

With:
```js
const done      = challenge.envelopes.filter(Boolean).length
const saved     = challenge.envelopes.reduce((s, v, i) => v ? s + slotVal(i) : s, 0)
const total     = isCustom ? customAmounts.reduce((s, v) => s + v, 0) : config.totalFn(m)
const remaining = total - saved
const pct       = totalSlots > 0 ? Math.round(done / totalSlots * 100) : 0
```

- [ ] **Step 4: Fix toggleEnvelope — two slotValue references**

In `toggleEnvelope`, replace:
```js
const entry = { index: i, value: config.slotValue(i, m), ts, done: next[i] }
```
With:
```js
const entry = { index: i, value: slotVal(i), ts, done: next[i] }
```

Replace:
```js
dbWriteEvent(challengeId, currentUser?.id, 'envelope_filled', i, { value: config.slotValue(i, m) })
```
With:
```js
dbWriteEvent(challengeId, currentUser?.id, 'envelope_filled', i, { value: slotVal(i) })
```

- [ ] **Step 5: Fix checkMilestones — config.slots references**

In `checkMilestones`, replace every `config.slots` with `totalSlots`:
```js
const pctNow = doneCount / totalSlots * 100
if (doneCount === totalSlots && !state.celebrationMap.get(challengeId)) {
```
And:
```js
const threshold = Math.round(totalSlots * mp / 100)
if (doneCount >= threshold && !milestonesRef.current.has(mp)) {
  milestonesRef.current.add(mp)
  if (mp < 100) {
    launchConfetti(30)
    showMilestoneBanner(
      `${mp}% done! 🎉`,
      `You've filled ${doneCount} of ${totalSlots} ${config.slotLabelPlural}. Keep going!`,
```

- [ ] **Step 6: Fix randomiser display**

Find:
```js
{randResult !== null ? `${config.slotLabel === 'envelope' ? '#' : ''}${randResult + 1} — ${fmt(config.slotValue(randResult, m), currency)}` : 'Pick for me'}
```
Replace with:
```js
{randResult !== null ? `${config.slotLabel === 'envelope' ? '#' : ''}${randResult + 1} — ${fmt(slotVal(randResult), currency)}` : 'Pick for me'}
```

- [ ] **Step 7: Fix stats grid — config.slots references**

Find:
```jsx
<div className="stat-sub">of {config.slots}</div>
```
Replace with:
```jsx
<div className="stat-sub">of {totalSlots}</div>
```

Find:
```jsx
<div className="stat-value">{config.slots - done}</div>
```
Replace with:
```jsx
<div className="stat-value">{totalSlots - done}</div>
```

Find:
```jsx
<div className="grid-title">Your {config.slots} {config.slotLabelPlural}</div>
```
Replace with:
```jsx
<div className="grid-title">Your {totalSlots} {config.slotLabelPlural}</div>
```

- [ ] **Step 8: Add custom tile grid render block**

In the grid section, after the `day_365` grid block, add:

```jsx
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
          className={[
            'env-cell',
            isDone          ? 'done'        : '',
            highlighted === i ? 'highlighted' : '',
            popping === i     ? 'popping'     : '',
          ].filter(Boolean).join(' ')}
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
```

- [ ] **Step 9: Verify dev server — open a custom challenge**

After creating a test custom challenge, open ChallengeScreen. Confirm:
- Tile grid shows correct amounts
- Tapping a tile marks it and updates "Saved" total
- Progress bar and % update correctly
- Stats show correct `totalSlots` count

- [ ] **Step 10: Commit**

```bash
git add src/components/app/ChallengeScreen.jsx
git commit -m "feat: add custom challenge support to ChallengeScreen"
```

---

## Task 18: DashboardScreen.jsx — custom challenge integration

**Files:**
- Modify: `src/components/app/DashboardScreen.jsx`

- [ ] **Step 1: Read isPremium from state**

Find the destructuring line:
```js
const { challenge, currentUser, activeChallenges, challengeId } = state
```
Replace with:
```js
const { challenge, currentUser, activeChallenges, challengeId, isPremium, creatorReturnTo } = state
```

- [ ] **Step 2: Fix totalSaved for custom type**

In `DashboardScreen`, find the `totalSaved` reduce for `activeChallenges`. Replace the inner reduce body so custom challenges use `tile_amounts`:

```js
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
    if (!prog.length) return sum   // no progress yet
    return sum + prog.reduce((s, v, i) => v ? s + (tileAmounts[i] ?? 0) : s, 0)
  }
  if (!prog.length) return sum + totalForMult(ch.multiplier || 1, ch.type)
  return sum + prog.reduce((s, v, i) => v ? s + cfg.slotValue(i, ch.multiplier || 1) : s, 0)
}, 0)
```

- [ ] **Step 3: Fix openChallenge to pass customAmounts**

In the `openChallenge` function, add `customAmounts` to the SET_CHALLENGE dispatch:

```js
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
    customAmounts: cd.tile_amounts || [],    // ← ADD
    doneLog:       cd.done_log || [],
    highlightedEnv: null,
    startedAt:     ch.started_at,
  }})
  dispatch({ type: 'SET_SCREEN', payload: 'app' })
}
```

- [ ] **Step 4: Add "+ Custom challenge" button**

Find a suitable location in the DashboardScreen JSX — near the active challenges header or below the challenge list. Add:

```jsx
<button
  className="btn-secondary"
  style={{ marginTop: 12, width: '100%' }}
  onClick={() => {
    dispatch({ type: 'SET_CREATOR_RETURN_TO', payload: 'dashboard' })
    dispatch({ type: 'SET_SCREEN', payload: 'custom-creator' })
  }}
>
  + Custom challenge
</button>
```

- [ ] **Step 5: Verify dashboard**

Open dashboard. Confirm:
- "Total saved" figure is correct (including any custom challenges)
- Clicking a custom challenge card opens ChallengeScreen with correct amounts
- "+ Custom challenge" button navigates to the creator

- [ ] **Step 6: Commit**

```bash
git add src/components/app/DashboardScreen.jsx
git commit -m "feat: integrate custom challenge into DashboardScreen"
```

---

## Task 19: AuthScreen.jsx — add Custom card to panel-challenge

**Files:**
- Modify: `src/components/app/AuthScreen.jsx`

- [ ] **Step 1: Read isPremium from appState**

In `AuthScreen`, it currently reads `state` from `useApp()`. Add `isPremium` to the destructuring:

```js
const { state, dispatch } = useApp()
// ... existing
const { isPremium } = state    // ← ADD (or add to existing destructure)
```

- [ ] **Step 2: Add the Custom card in panel-challenge**

In the `panel-challenge` panel, find the `challenge-type-grid` div that contains the 3 existing challenge type buttons. Add a fourth button after them:

```jsx
{/* Custom challenge card */}
<button
  className={`challenge-type-option${!isPremium ? ' locked' : ''}`}
  onClick={() => {
    if (!isPremium) {
      showToast('Custom challenges are a Pro feature. Upgrade to Day One.')
      return
    }
    dispatch({ type: 'SET_CREATOR_RETURN_TO', payload: 'auth' })
    dispatch({ type: 'SET_SCREEN',            payload: 'custom-creator' })
  }}
>
  <div className="cto-icon">✨</div>
  <div className="cto-name">Custom</div>
  <div className="cto-desc">{isPremium ? 'Build your own' : '🔒 Pro'}</div>
</button>
```

- [ ] **Step 3: Verify auth flow**

Sign out, sign back in as a new user. Reach `panel-challenge`. Confirm:
- Custom card appears alongside the 3 existing challenge types
- Tapping Custom (as a pro user) navigates to `custom-creator` screen
- After completing the creator, you land on ChallengeScreen with the custom challenge

- [ ] **Step 4: Commit**

```bash
git add src/components/app/AuthScreen.jsx
git commit -m "feat: add Custom challenge card to auth setup panel-challenge"
```

---

## Task 20: End-to-end verification checklist

**No code changes — manual testing only.**

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all unit tests pass.

- [ ] **Step 2: Run the build**

```bash
npm run build
```

Expected: `✓ built` with no errors (chunk size warning is OK).

- [ ] **Step 3: Test — Auto mode flow**

1. Sign in → reach Dashboard → click "+ Custom challenge"
2. Step 1 (Name): enter "Test Auto", tap Continue
3. Step 2 (Picker): tap "Build it for me"
4. Step 3 (Auto): enter 10 tiles, £500 target, select "Ascending"
5. Tap Generate → verify amounts appear, total shown as £500
6. Tap Preview → verify 10 tiles in correct ascending order
7. Tap "Create challenge" → land on ChallengeScreen
8. Verify: tile grid shows correct amounts, "Total" stat = £500, "Done" = 0 of 10
9. Tap one tile → verify it marks as done, "Saved" amount updates correctly

- [ ] **Step 4: Test — Manual mode flow**

1. Dashboard → "+ Custom challenge" → Name: "Manual Test" → Continue
2. Picker → "I'll build it myself"
3. Add 4 tiles: 100, 200, 300, 400
4. Verify live total shows £1,000
5. Tap Preview → verify 4 tiles, total £1,000
6. Tap "Edit tiles" → returns to manual mode with amounts pre-filled
7. Tap Preview again → Create challenge
8. Open ChallengeScreen → verify correct amounts, tap tiles, verify saved total

- [ ] **Step 5: Test — Template flow**

1. Dashboard → "+ Custom challenge" → Name: "Holiday" → Continue
2. Picker → tap "Holiday Fund" template
3. Lands directly on Preview: 12 tiles, £1,200 total, equal amounts (£100 each)
4. Create → ChallengeScreen → verify

- [ ] **Step 6: Test — Draft persistence**

1. Start creator → enter name → go to Auto → enter tiles + target → Generate
2. Close the tab / navigate away
3. Return to creator → confirm "Continue your draft?" banner appears
4. Tap Continue → verify you're on the auto step with values pre-filled

- [ ] **Step 7: Test — Paid gate (free user)**

1. In Supabase, set your `is_pro = false`
2. Sign out, sign back in
3. Go to Dashboard → "+ Custom challenge" → Name step works
4. Picker step: all cards locked, upgrade prompt visible
5. Tapping any card shows CheckoutModal

- [ ] **Step 8: Test — Shuffle (random spread)**

1. Create auto challenge with "Random" spread → Preview
2. Verify "Shuffle" button appears
3. Tap Shuffle → tiles rearrange, total stays the same (precision-exact)

- [ ] **Step 9: Test — Paste support**

1. Manual mode → click paste textarea → paste "50, 100, 150, 200"
2. Verify 4 tile inputs appear pre-filled
3. Verify live total = £500

- [ ] **Step 10: Commit final verification**

```bash
git add -A
git commit -m "feat: complete Custom Challenge Creator — all tasks done"
```
