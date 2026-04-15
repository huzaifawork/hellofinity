# Custom Challenge Creator — Design Spec
**Date:** 2026-04-13  
**App:** HelloFinity (React 18 + Vite + Supabase)  
**Status:** Approved — ready for implementation planning

---

## 1. Overview

A "Custom Challenge Creator" feature allowing users to build their own savings challenge with arbitrary tile amounts. It is a **paid (Pro) feature** accessible from two entry points: the post-signup setup wizard and the dashboard. It functions as a self-contained mini-app inside the existing app, outputting a standard challenge object that the existing `ChallengeScreen` consumes without modification (beyond one conditional).

---

## 2. Entry Points

| Entry Point | Trigger | `creatorReturnTo` |
|---|---|---|
| Auth setup (`panel-challenge`) | New "Custom" card alongside existing 3 challenge types | `'auth'` |
| Dashboard | "Add custom challenge +" button | `'dashboard'` |

Both entry points dispatch:
```js
dispatch({ type: 'SET_SCREEN', payload: 'custom-creator' })
dispatch({ type: 'SET_CREATOR_RETURN_TO', payload: 'auth' | 'dashboard' })
```

---

## 3. Architecture: Three Layers

### 3.1 UI Layer
```
src/components/creator/
  CustomChallengeCreator.jsx   ← wizard shell + step router
  StepName.jsx                 ← Step 1
  StepPicker.jsx               ← Step 2: templates + mode selection
  StepAutoBuilder.jsx          ← Step 3a: "Build it for me"
  StepManualBuilder.jsx        ← Step 3b: "I'll build it myself"
  StepPreview.jsx              ← Step 4: tile grid preview + confirm

src/styles/creator.css         ← scoped creator styles
```

### 3.2 State Layer
```
src/hooks/useCreatorState.js   ← isolated useReducer + sessionStorage sync
```

### 3.3 Logic Layer
```
src/utils/tileCalculations.js  ← pure functions, zero React, zero side effects
src/utils/creatorValidation.js ← soft hints + hard blocking rules
```

**Rule:** UI components never call calculation functions directly. All calculations go through the state layer dispatch.

---

## 4. AppContext Changes

### 4.1 New screen value
```js
screen: 'loading' | 'auth' | 'app' | 'dashboard' | 'custom-creator'
```

### 4.2 New state fields
```js
creatorReturnTo: 'auth' | 'dashboard' | null,
user: {
  isPremium: false,   // loaded from profile.is_pro on login
}
```

### 4.3 New reducer cases
```js
case 'SET_CREATOR_RETURN_TO': return { ...state, creatorReturnTo: action.payload }
case 'SET_IS_PREMIUM':        return { ...state, isPremium: action.payload }
```

### 4.4 Challenge state extension
```js
challenge: {
  ...existing fields,
  customAmounts: [],   // number[] — used when challengeType === 'custom'
}
```

---

## 5. Creator State (useCreatorState)

### 5.1 Full state shape
```js
{
  step: 'name' | 'picker' | 'auto' | 'manual' | 'preview',
  mode: 'auto' | 'manual' | null,
  name: '',

  // Auto mode — dual representation
  tilesInput:  '',      // raw string (UI layer)
  targetInput: '',      // raw string (UI layer)
  tiles:       null,    // validated number | null (logic layer)
  target:      null,    // validated number | null (logic layer)
  spread:      'equal', // 'equal' | 'ascending' | 'descending' | 'random'

  // Single source of truth for tile values
  amounts:     [],      // number[] — committed valid values

  // Shuffle integrity
  baseAmounts: [],      // number[] — ascending sorted, never mutated after generation
                        // used as source for reshuffle

  // Manual mode
  manualInputs: [],     // string[] — editing state (may contain invalid values)
                        // amounts updates only on blur / valid input

  // Draft persistence
  isDraft:     false,
  lastUpdated: null,
  version:     1,       // bump when state shape changes

  // Async
  isCreating:  false,   // true while dbCreateCustomChallenge() is in flight
}
```

### 5.2 Key rules
- `amounts` is always the single source of truth for tile values
- `manualInputs` is transient editing state — never overwrites `amounts` while invalid
- `tiles` and `target` are always numbers or null — raw strings stay in `tilesInput`/`targetInput`
- `baseAmounts` is set once on auto-generate, never mutated — only `amounts` is shuffled

---

## 6. Wizard Flow

```
Step 1: Name
  → validate: name.trim().length >= 1
  → Next enabled only when valid

Step 2: Picker
  → Show 4 preset templates (pre-fill name + tiles + target + spread)
  → Show "Build it for me" mode card
  → Show "I'll build it myself" mode card
  → Templates jump directly to Preview after auto-generating amounts
  → Mode cards go to Step 3a or 3b

Step 3a: Auto Builder (mode = 'auto')
  → User fills tilesInput and targetInput
  → Calculation triggers ONLY when tiles (valid ≥ 2) AND target (valid > 0)
  → Spread is a modifier, never a trigger condition
  → Debounce: calculate on blur OR "Generate" button tap
  → Preview button enabled after amounts are generated

Step 3b: Manual Builder (mode = 'manual')
  → Dynamic list of inputs (add/remove tiles)
  → Paste support: batch parse in single state update
  → amounts updates on blur or valid input only
  → Live total shown
  → Switch to Auto: show confirmation dialog first

Step 4: Preview
  → Read-only tile grid
  → Total (large emphasis)
  → Tile count
  → Shuffle button (random spread only) — reshuffles from baseAmounts
  → "Edit tiles" → goes to Manual (copies amounts → manualInputs)
  → "Create Challenge" → calls dbCreateCustomChallenge()
```

### 6.1 Step skipping prevention
`Next` button on each step is disabled until that step's validation passes. Users cannot reach Step 4 without valid amounts.

### 6.2 Back navigation
Every step has a Back button. Back from Step 3 → Step 2. Back from Step 2 → Step 1. Back from Step 1 → `creatorReturnTo` screen (with draft saved).

### 6.3 Mode switching
**Auto → Manual:** Copy `amounts` into `manualInputs`, switch step to `'manual'`. No confirmation needed (no data loss).

**Manual → Auto:** Show confirmation: "This will replace your custom tiles with generated ones. Continue?" If confirmed, clear `manualInputs`, run auto-generation, go to `'auto'`.

---

## 7. Calculation Logic (tileCalculations.js)

All functions are pure: `(n, total, precision) → number[]`.  
All functions call `finalize()` as their last step.

### 7.1 Precision finalizer (enforced centrally)
```js
function finalize(amounts, target, precision) {
  const sum = amounts.reduce((a, b) => a + b, 0)
  const diff = parseFloat((target - sum).toFixed(precision))
  if (diff !== 0) {
    amounts[amounts.length - 1] = parseFloat(
      (amounts[amounts.length - 1] + diff).toFixed(precision)
    )
  }
  return amounts
}
```
This guarantees `sum(amounts) === target` exactly, correcting floating-point drift on the last tile only.

### 7.2 Equal spread
```js
function generateEqual(n, total, precision) {
  const base = parseFloat((total / n).toFixed(precision))
  const amounts = Array(n).fill(base)
  return finalize(amounts, total, precision)
}
```

### 7.3 Ascending spread
```js
function generateAscending(n, total, precision) {
  const weights = Array.from({ length: n }, (_, i) => i + 1)
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const scale = total / weightSum
  const amounts = weights.map(w => parseFloat((w * scale).toFixed(precision)))
  return finalize(amounts, total, precision)
}
```

### 7.4 Descending spread
```js
function generateDescending(n, total, precision) {
  return generateAscending(n, total, precision).reverse()
}
```

### 7.5 Random spread
```js
function generateRandom(n, total, precision) {
  const ascending = generateAscending(n, total, precision)
  return fisherYates([...ascending])  // shuffle copy, never mutate ascending
}

function fisherYates(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
```

### 7.6 Dispatch to correct function
```js
export function generateAmounts(n, total, spread, precision = 2) {
  const generators = {
    equal:      generateEqual,
    ascending:  generateAscending,
    descending: generateDescending,
    random:     generateRandom,
  }
  return (generators[spread] || generateEqual)(n, total, precision)
}
```

`precision` comes from `CURRENCIES[currency].decimals` — always passed in, never hardcoded.

### 7.7 Shuffle (preview screen, random mode only)
```js
// baseAmounts is stored in state and never mutated
const reshuffled = fisherYates([...baseAmounts])
dispatch({ type: 'SET_AMOUNTS', payload: reshuffled })
```

---

## 8. Validation (creatorValidation.js)

### 8.1 Validation types
- **Soft (real-time hints):** shown inline below the field, don't block typing
- **Hard (on Next/Generate):** block progress, show actionable message

### 8.2 Rules

| Field | Condition | Type | Message |
|---|---|---|---|
| Name | empty | Hard | "Give your challenge a name to continue." |
| Tiles | < 2 | Hard | "You need at least 2 tiles to make a challenge." |
| Tiles | > 200 | Soft | "That's a lot of tiles — are you sure? Most people do under 100." |
| Tiles | not a whole number | Hard | "Tiles must be a whole number." |
| Target | ≤ 0 | Hard | "Enter a target amount greater than zero." |
| Target / Tiles | < 0.01 per tile | Soft | "Try £[min] or more for [n] tiles — each tile needs at least 1p." |
| Any amount | < 0.01 | Hard | "Each tile needs a value of at least 1p (or equivalent)." |
| Any amount | negative | Hard | "Tile amounts can't be negative." |
| Manual: paste | all invalid | Soft | "None of those looked like valid amounts. Try numbers separated by commas." |

### 8.3 Validation return shape
```js
{ valid: boolean, message: string | null, type: 'soft' | 'hard' | null }
```

---

## 9. Dynamic Grid Columns

```js
function gridCols(n) {
  if (n <= 4)   return 2
  if (n <= 9)   return 3
  if (n <= 16)  return 4
  if (n <= 30)  return 5
  if (n <= 60)  return 7
  if (n <= 100) return 10
  return 12
}
```

Goal: tiles always readable and touch-friendly. No horizontal overflow.

---

## 10. Templates

| Template | Tiles | Target | Spread |
|---|---|---|---|
| Holiday Fund | 12 | £1,200 | Equal |
| Christmas Savings | 10 | £500 | Ascending |
| Emergency Fund | 6 | £3,000 | Equal |
| Payday Challenge | 4 | £400 | Equal |

Behavior on template tap:
1. Pre-fill `name`, `tilesInput`, `targetInput`, `tiles`, `target`, `spread`
2. Auto-generate `amounts` and `baseAmounts`
3. Skip to Step 4 (Preview) — user can go back to tweak

Templates are visible to free users but tapping shows the upgrade prompt.

---

## 11. Paid Gate (isPremium)

### 11.1 Database
```sql
-- Run once in Supabase SQL editor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
```

### 11.2 Loading
`dbUpsertProfile` already returns profile data. Add `is_pro` to the select. On login, dispatch:
```js
dispatch({ type: 'SET_IS_PREMIUM', payload: profile.is_pro === true })
```

### 11.3 UI behavior
- Creator entry points visible to all users
- Free users: templates + mode cards shown with lock icon, muted/tinted
- Tapping locked item: inline upgrade card appears
  - "Custom challenges are a Pro feature."
  - "Get Day One →" button → opens existing `CheckoutModal`
- Pro users: full access, no gate

### 11.4 Manual override (for testing)
Set `is_pro = true` on your own row in the Supabase Table Editor.

---

## 12. Database Integration

### 12.1 challenge_progress row (custom)
```js
{
  challenge_id: ch.id,
  progress:     Array(n).fill(false),   // existing field
  tile_amounts: amounts,                 // new field — number[]
  done_log:     [],                      // existing field
  metadata: {
    created_from: 'custom_creator',
    version:      1,
    spread:       state.spread,          // 'auto' mode only, else null
    mode:         state.mode,
    generated_at: new Date().toISOString(),
  }
}
```

### 12.2 challenges row
```js
{
  user_id:    userId,
  type:       'custom',
  goal_label: state.name,
  multiplier: 1,               // ignored for custom — amounts are absolute
  currency:   currency,
  started_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
```

### 12.3 CHALLENGE_CONFIGS extension
```js
custom: {
  type:            'custom',
  label:           'Custom Challenge',
  slots:           0,           // set dynamically per challenge instance
  slotValue:       (i, _m, amounts) => amounts?.[i] ?? 0,
  totalFn:         (_m, amounts) => amounts?.reduce((s, v) => s + v, 0) ?? 0,
  gridCols:        10,          // overridden by gridCols() function
  slotLabel:       'tile',
  slotLabelPlural: 'tiles',
}
```

### 12.4 ChallengeScreen change (single conditional)
```js
// Before (existing):
const value = config.slotValue(i, m)
const total = config.totalFn(m)

// After (one conditional added):
const value = challenge.challengeType === 'custom'
  ? config.slotValue(i, m, challenge.customAmounts)
  : config.slotValue(i, m)

const total = challenge.challengeType === 'custom'
  ? config.totalFn(m, challenge.customAmounts)
  : config.totalFn(m)
```

---

## 13. Draft Persistence

Storage: `sessionStorage` key `hf-creator-draft`.  
Saved: on every state change, debounced 500ms.  
Cleared: on challenge created, on confirmed cancel with `isDraft = true`, on sign-out.

### 13.1 Draft validation on restore
```js
const DRAFT_VERSION = 1

function isValidDraft(draft) {
  return (
    draft != null &&
    draft.version === DRAFT_VERSION &&
    typeof draft.name === 'string' &&
    Array.isArray(draft.amounts)
  )
}
```
Invalid draft (old schema, corrupted): discard silently. No error shown to user.

### 13.2 Draft restore UI
Banner at top of creator: "You have an unfinished challenge. Continue where you left off?" with "Continue" and "Start fresh" buttons.

---

## 14. Analytics Events

All via existing `dbWriteEvent(challengeId, userId, eventType, null, metadata)`.  
For pre-creation events where `challengeId` is null, pass `null` — the function already handles this.

| Event | When |
|---|---|
| `creator_opened` | On `CustomChallengeCreator` mount |
| `creator_mode_selected` | On mode or template tap |
| `creator_amounts_generated` | On auto-generate success |
| `creator_challenge_created` | On successful DB write |
| `creator_abandoned` | On cancel with `isDraft = true` |

---

## 15. Loading & Feedback States

### 15.1 During creation
- Confirm button: disabled + label changes to "Creating…" + spinner
- All form inputs disabled
- `isCreating = true` in creator state

### 15.2 On success
```
1. Clear sessionStorage draft
2. Dispatch challenge to AppContext (SET_CHALLENGE, SET_CHALLENGE_ID, SET_ACTIVE_CHALLENGES)
3. dispatch({ type: 'SET_SCREEN', payload: 'app' })
4. showToast('Your custom challenge is ready!')
```

### 15.3 On failure
- `isCreating = false`
- Inline error below button: "Something went wrong — tap to try again."
- No raw error messages shown

---

## 16. Manual Mode — Paste Support

```js
function parsePaste(rawText) {
  return rawText
    .split(/[\n,]+/)
    .map(s => parseFloat(s.trim()))
    .filter(v => !isNaN(v) && v >= 0.01)
}
// Single dispatch — one state update regardless of value count
dispatch({ type: 'PASTE_AMOUNTS', payload: parsePaste(pastedText) })
```

Invalid values silently ignored. If ALL values are invalid, show soft hint: "None of those looked like valid amounts. Try numbers separated by commas."

---

## 17. Undo (Manual Mode)

Single-level undo: store `previousAmounts` snapshot on each committed change. "Undo last change" button shown after any edit. Keyboard: Ctrl+Z / Cmd+Z.

---

## 18. Accessibility

- All icon buttons have `aria-label`
- All inputs have associated `<label>`
- Tile grid is keyboard-navigable (tab + Enter to mark)
- Color contrast meets WCAG AA
- Tap targets minimum 44×44px

---

## 19. Performance

- Tile components memoized with `React.memo` — only re-render when their specific `amounts[i]` changes
- Auto-calculation debounced (300ms on input, immediate on blur)
- Draft save debounced (500ms)
- Paste parsing is a single synchronous operation, not iterative state updates

---

## 20. New Files Summary

| File | Purpose |
|---|---|
| `src/components/creator/CustomChallengeCreator.jsx` | Wizard shell, step router |
| `src/components/creator/StepName.jsx` | Step 1 — name input |
| `src/components/creator/StepPicker.jsx` | Step 2 — templates + mode cards |
| `src/components/creator/StepAutoBuilder.jsx` | Step 3a — auto generation |
| `src/components/creator/StepManualBuilder.jsx` | Step 3b — manual tile builder |
| `src/components/creator/StepPreview.jsx` | Step 4 — preview + confirm |
| `src/hooks/useCreatorState.js` | Isolated creator reducer + session persistence |
| `src/utils/tileCalculations.js` | Pure calculation functions |
| `src/utils/creatorValidation.js` | Validation rules + friendly messages |
| `src/styles/creator.css` | Scoped creator styles |

## 21. Modified Files Summary

| File | Change |
|---|---|
| `src/context/AppContext.jsx` | Add `screen: 'custom-creator'`, `creatorReturnTo`, `isPremium`, `challenge.customAmounts` |
| `src/utils/challengeConfigs.js` | Add `custom` config entry |
| `src/services/db.js` | Add `dbCreateCustomChallenge()`, extend `dbLoadActiveChallenges` to return `tile_amounts` |
| `src/components/app/ChallengeScreen.jsx` | Add single conditional for custom `slotValue`/`totalFn` |
| `src/components/app/DashboardScreen.jsx` | Add "Add custom challenge +" button |
| `src/components/app/AuthScreen.jsx` | Add "Custom" card in `panel-challenge` |
| `src/pages/AppPage.jsx` | Render `CustomChallengeCreator` when `screen === 'custom-creator'` |
| `src/styles/app.css` | Minor additions for lock/gate UI |
