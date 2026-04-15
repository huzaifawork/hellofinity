export const CHALLENGE_CONFIGS = {
  envelope_100: {
    type:            'envelope_100',
    label:           '100 Envelope Challenge',
    slots:           100,
    slotValue:       (index, m) => (index + 1) * m,
    totalFn:         m => 5050 * parseFloat(m || 1),
    gridCols:        10,
    slotLabel:       'envelope',
    slotLabelPlural: 'envelopes',
  },
  week_52: {
    type:            'week_52',
    label:           '52 Week Challenge',
    slots:           52,
    slotValue:       (index, m) => (index + 1) * m,
    totalFn:         m => 1378 * parseFloat(m || 1),
    gridCols:        13,
    slotLabel:       'week',
    slotLabelPlural: 'weeks',
  },
  day_365: {
    type:            'day_365',
    label:           '365 Day Challenge',
    slots:           365,
    slotValue:       (index, m) => (index + 1) * 0.01 * parseFloat(m || 1),
    totalFn:         m => 667.95 * parseFloat(m || 1),
    gridCols:        15,
    slotLabel:       'day',
    slotLabelPlural: 'days',
  },
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
}

export const CURRENCIES = {
  GBP: { symbol: '£', decimals: 2 },
  USD: { symbol: '$', decimals: 2 },
  EUR: { symbol: '€', decimals: 2 },
  JPY: { symbol: '¥', decimals: 0 },
  INR: { symbol: '₹', decimals: 2 },
}

export const MILESTONE_PCTS = [10, 25, 50, 75, 100]
export const CONF_COLORS = ['#F5C842','#FAE18E','#A8D5B5','#7AAAC8','#C4614A','#FAFAF8','#550000','#D4A8E8']
