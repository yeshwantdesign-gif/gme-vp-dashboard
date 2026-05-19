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
 *   - if the selected range is "to-date" (ongoing period clipped by today),
 *     the comparison range is trimmed to the same day-count from its start,
 *     so the two periods are apples-to-apples (MTD vs prior MTD, etc.)
 */
export function adjustRangesForToday(
  selected: DateRange,
  comparison: DateRange,
  todayStr?: string,
): { selected: DateRange; comparison: DateRange } {
  const today = todayStr ?? format(new Date(), 'yyyy-MM-dd')
  const clipped = clipToToday(selected, today)
  const matched = clipped.to !== selected.to
    ? trimToDayCount(comparison, lengthInDays(clipped))
    : comparison
  return { selected: clipped, comparison: clipToToday(matched, today) }
}
