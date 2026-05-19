import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export interface DateRange {
  from: string
  to: string
}

export interface PeriodComparisonRow {
  country: string
  primaryCases: number
  comparisonCases: number
  deltaCases: number
  deltaPct: number | null
}

function clipToToday(r: DateRange, today: string): DateRange {
  if (r.to <= today) return r
  if (r.from > today) return { from: r.from, to: r.from }
  return { from: r.from, to: today }
}

function lengthInDays(r: DateRange): number {
  return differenceInCalendarDays(parseISO(r.to), parseISO(r.from)) + 1
}

function trimToDayCount(r: DateRange, dayCount: number): DateRange {
  const proposed = format(addDays(parseISO(r.from), dayCount - 1), 'yyyy-MM-dd')
  return { from: r.from, to: proposed < r.to ? proposed : r.to }
}

/**
 * Trim ranges so that:
 *   - any range extending past today is clipped to today
 *   - if EITHER side gets clipped by today (i.e. is "to-date"), both sides
 *     are trimmed to the shorter day-count so the comparison is apples-to-apples
 *     (e.g. May 1–19 vs April 1–19, or 2026 Jan 1–May 19 vs 2025 Jan 1–May 19)
 */
export function adjustRangesForToday(
  selected: DateRange,
  comparison: DateRange,
  todayStr?: string,
): { selected: DateRange; comparison: DateRange } {
  const today = todayStr ?? format(new Date(), 'yyyy-MM-dd')
  let s = clipToToday(selected, today)
  let c = clipToToday(comparison, today)
  const eitherClipped = s.to !== selected.to || c.to !== comparison.to
  if (eitherClipped) {
    const minLen = Math.min(lengthInDays(s), lengthInDays(c))
    s = trimToDayCount(s, minLen)
    c = trimToDayCount(c, minLen)
  }
  return { selected: s, comparison: c }
}
