import { CURRENCIES, CHALLENGE_CONFIGS } from './challengeConfigs'

export function fmtCur(amount, cur) {
  if (!cur) cur = { symbol: '£', decimals: 2 }
  const n = parseFloat(amount) || 0
  if (cur.decimals === 0) {
    return cur.symbol + Math.round(n).toLocaleString()
  }
  if (Number.isInteger(n) || n >= 100) {
    return cur.symbol + Math.round(n).toLocaleString()
  }
  return cur.symbol + n.toFixed(cur.decimals)
}

export function fmt(amount, currency = 'GBP') {
  const cur = CURRENCIES[currency] || CURRENCIES.GBP
  return fmtCur(amount, cur)
}

export function fmtCompact(amount, currency = 'GBP') {
  const cur = CURRENCIES[currency] || CURRENCIES.GBP
  const n = parseFloat(amount) || 0
  if (cur.decimals === 0) return cur.symbol + Math.round(n)
  if (n < 1) return cur.symbol + '.' + String(Math.round(n * 100)).padStart(2, '0')
  if (Number.isInteger(n)) return cur.symbol + n
  return cur.symbol + n.toFixed(cur.decimals)
}

export function totalForMult(m, challengeType = 'envelope_100') {
  const config = CHALLENGE_CONFIGS[challengeType] || CHALLENGE_CONFIGS.envelope_100
  return config.totalFn(m)
}

export function getCalendarMonths(startDateStr) {
  if (!startDateStr) {
    const now = new Date()
    startDateStr = now.toISOString()
  }
  const start = new Date(startDateStr)
  start.setHours(0, 0, 0, 0)
  const months = []
  let globalDay = 0
  let current = new Date(start)
  while (globalDay < 365) {
    const year = current.getFullYear()
    const month = current.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const remaining = 365 - globalDay
    const count = Math.min(daysInMonth - current.getDate() + 1, remaining)
    months.push({
      label: current.toLocaleDateString('en-GB', { month: 'long' }),
      year,
      globalStart: globalDay,
      count,
    })
    globalDay += count
    current = new Date(year, month + 1, 1)
  }
  return months
}
