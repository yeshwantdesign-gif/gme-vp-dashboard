import type { Rule } from './types'

const krwFmt = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
})

const bankNames: Record<string, string> = {
  '광주은행': 'Kwangju Bank (광주은행)',
  '전북은행': 'Jeonbuk Bank (전북은행)',
  '대구은행': 'Daegu Bank (대구은행)',
  '부산은행': 'Busan Bank (부산은행)',
  '경남은행': 'Gyeongnam Bank (경남은행)',
  '제주은행': 'Jeju Bank (제주은행)',
}

const dayNames: Record<string, string> = {
  Mon: 'Mondays',
  Tue: 'Tuesdays',
  Wed: 'Wednesdays',
  Thu: 'Thursdays',
  Fri: 'Fridays',
  Sat: 'Saturdays',
  Sun: 'Sundays',
}

const dayNamesKo: Record<string, string> = {
  Mon: '월요일',
  Tue: '화요일',
  Wed: '수요일',
  Thu: '목요일',
  Fri: '금요일',
  Sat: '토요일',
  Sun: '일요일',
}

function parseInList(condition: string): string[] {
  const match = condition.match(/IN\s*\[([^\]]+)\]/)
  if (!match) return []
  return match[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
}

function parseRange(condition: string): { min: string; max: string } | null {
  // Patterns: "X–Y", "X-Y", "between X and Y", ">= X AND <= Y"
  const dashMatch = condition.match(/([\d,.]+)\s*[–-]\s*([\d,.]+)/)
  if (dashMatch) return { min: dashMatch[1], max: dashMatch[2] }
  const betweenMatch = condition.match(/between\s+([\d,.]+)\s+and\s+([\d,.]+)/i)
  if (betweenMatch) return { min: betweenMatch[1], max: betweenMatch[2] }
  const rangeMatch = condition.match(/>?=?\s*([\d,.]+)\s*(?:AND|and|&)\s*<?=?\s*([\d,.]+)/)
  if (rangeMatch) return { min: rangeMatch[1], max: rangeMatch[2] }
  return null
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

export function formatRuleCondition(
  rule: Rule,
  t: (key: string, vars?: Record<string, string | number>) => string,
  tCountry: (name: string) => string,
  locale: string
): string {
  const { feature, condition } = rule
  const feat = feature.toLowerCase()

  // Region Group
  if (feat.includes('region')) {
    const vals = parseInList(condition)
    if (vals.some((v) => v.toLowerCase() === 'non-cis')) {
      return t('rulesets.rules.regionNonCis')
    }
    return t('rulesets.rules.regionCis')
  }

  // Receiver Country
  if (feat.includes('receiver') && feat.includes('country')) {
    const vals = parseInList(condition)
    const translated = vals.map((v) => tCountry(v)).join(', ')
    return t('rulesets.rules.fundsSentTo', { countries: translated })
  }

  // Visa Type
  if (feat.includes('visa')) {
    const vals = parseInList(condition)
    const studentTypes = vals.filter((v) => /^[dD]-?\d/.test(v))
    const hasUnknown = vals.some((v) => v.toLowerCase() === 'unknown')
    const typeStr = vals.join(', ')
    if (studentTypes.length > 0 && hasUnknown) {
      return t('rulesets.rules.studentOrUnspecified', { types: studentTypes.join(', ') })
    }
    if (studentTypes.length > 0) {
      return t('rulesets.rules.studentVisas', { types: studentTypes.join(', ') })
    }
    return t('rulesets.rules.visaTypes', { types: typeStr })
  }

  // Age Group
  if (feat.includes('age')) {
    const vals = parseInList(condition)
    if (vals.length > 0) {
      return t('rulesets.rules.ageGroup', { age: vals[0] })
    }
  }

  // Deposit Channel (bank)
  if (feat.includes('channel') || feat.includes('deposit') && feat.includes('bank')) {
    const vals = parseInList(condition)
    if (vals.length > 0) {
      const bank = locale === 'ko'
        ? vals[0]
        : (bankNames[vals[0]] ?? vals[0])
      return t('rulesets.rules.depositVia', { bank })
    }
  }

  // Day of Week
  if (feat.includes('day') && feat.includes('week') || feat === 'dayofweek') {
    const vals = parseInList(condition)
    if (vals.length > 0) {
      const dayMap = locale === 'ko' ? dayNamesKo : dayNames
      const dayStr = vals.map((d) => dayMap[d] ?? d).join(', ')
      return t('rulesets.rules.dayOfWeek', { day: dayStr })
    }
  }

  // Hour
  if (feat.includes('hour')) {
    const vals = parseInList(condition)
    if (vals.length > 0) {
      const hours = vals.map((v) => formatHour(parseInt(v, 10))).join(', ')
      return t('rulesets.rules.peakHours', { hours })
    }
  }

  // Deposit Amount
  if (feat.includes('amt') || feat.includes('amount')) {
    const range = parseRange(condition)
    if (range) {
      const min = krwFmt.format(Number(range.min.replace(/,/g, '')))
      const max = krwFmt.format(Number(range.max.replace(/,/g, '')))
      return t('rulesets.rules.typicalAmount', { range: `${min}–${max}` })
    }
  }

  // Reporting Delay
  if (feat.includes('reporting') && feat.includes('delay')) {
    const range = parseRange(condition)
    if (range) {
      return t('rulesets.rules.reportingDelay', { range: `${range.min}–${range.max}` })
    }
  }

  // Registration-to-Phishing Duration
  if (feat.includes('registration') || feat.includes('phishing') && feat.includes('duration')) {
    const range = parseRange(condition)
    if (range) {
      return t('rulesets.rules.accountAge', { range: `${range.min}–${range.max}` })
    }
  }

  // Fallback
  return `${feature}: ${condition}`
}
