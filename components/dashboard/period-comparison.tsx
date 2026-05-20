'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, endOfMonth, subMonths, startOfMonth } from 'date-fns'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getPeriodComparison } from '@/lib/queries'
import { useLocale } from '@/contexts/locale-context'
import { Skeleton } from '@/components/ui/skeleton'
import type { Filters } from '@/lib/types'
import { adjustRangesForToday } from '@/lib/period-comparison'
import type { DateRange, PeriodComparisonRow } from '@/lib/period-comparison'

type RangeType = 'year' | 'quarter' | 'month' | 'custom'
type Quarter = 1 | 2 | 3 | 4

interface RangeSelection {
  type: RangeType
  year: number
  quarter: Quarter
  month: string         // 'YYYY-MM'
  customFrom: string    // 'YYYY-MM-DD'
  customTo: string
}

const inputClass =
  'rounded-[var(--gme-radius-sm)] border border-[var(--border)] bg-background px-2 py-1.5 text-sm outline-none focus:border-[var(--border-glow)]'

const fmtDate = (d: Date) => format(d, 'yyyy-MM-dd')

function yearRange(year: number): DateRange {
  return { from: fmtDate(new Date(year, 0, 1)), to: fmtDate(new Date(year, 11, 31)) }
}
function quarterRange(year: number, q: Quarter): DateRange {
  const startMonth = (q - 1) * 3
  return {
    from: fmtDate(new Date(year, startMonth, 1)),
    to: fmtDate(endOfMonth(new Date(year, startMonth + 2, 1))),
  }
}
function monthRange(yyyyMm: string): DateRange {
  const [y, m] = yyyyMm.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  return { from: fmtDate(first), to: fmtDate(endOfMonth(first)) }
}

function resolveRange(s: RangeSelection): DateRange {
  switch (s.type) {
    case 'year': return yearRange(s.year)
    case 'quarter': return quarterRange(s.year, s.quarter)
    case 'month': return monthRange(s.month)
    case 'custom': return { from: s.customFrom, to: s.customTo }
  }
}

function rangeLabel(s: RangeSelection, locale: string, qPrefix: string): string {
  switch (s.type) {
    case 'year':
      return `${s.year}`
    case 'quarter':
      return `${qPrefix}${s.quarter} ${s.year}`
    case 'month': {
      const f = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
        month: 'long', year: 'numeric',
      })
      return f.format(new Date(`${s.month}-01T00:00:00`))
    }
    case 'custom':
      return `${s.customFrom} → ${s.customTo}`
  }
}

function defaultSelection(monthsBack: number): RangeSelection {
  const target = startOfMonth(subMonths(new Date(), monthsBack))
  return {
    type: 'month',
    year: target.getFullYear(),
    quarter: (Math.floor(target.getMonth() / 3) + 1) as Quarter,
    month: format(target, 'yyyy-MM'),
    customFrom: fmtDate(target),
    customTo: fmtDate(endOfMonth(target)),
  }
}

function PeriodPicker({
  label,
  value,
  onChange,
  years,
}: {
  label: string
  value: RangeSelection
  onChange: (v: RangeSelection) => void
  years: number[]
}) {
  const { t } = useLocale()
  const qPrefix = t('dashboard.periodComparison.quarterPrefix')

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value as RangeType })}
          className={inputClass}
        >
          {(['year', 'quarter', 'month', 'custom'] as const).map((rt) => (
            <option key={rt} value={rt}>
              {t(`dashboard.periodComparison.rangeTypes.${rt}`)}
            </option>
          ))}
        </select>

        {value.type === 'year' && (
          <select
            value={value.year}
            onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
            className={inputClass}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}

        {value.type === 'quarter' && (
          <>
            <select
              value={value.year}
              onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
              className={inputClass}
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={value.quarter}
              onChange={(e) => onChange({ ...value, quarter: Number(e.target.value) as Quarter })}
              className={inputClass}
            >
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>{qPrefix}{q}</option>
              ))}
            </select>
          </>
        )}

        {value.type === 'month' && (
          <input
            type="month"
            value={value.month}
            onChange={(e) => onChange({ ...value, month: e.target.value })}
            className={inputClass}
          />
        )}

        {value.type === 'custom' && (
          <>
            <input
              type="date"
              value={value.customFrom}
              onChange={(e) => onChange({ ...value, customFrom: e.target.value })}
              className={inputClass}
            />
            <span className="text-xs text-[var(--text-secondary)]">→</span>
            <input
              type="date"
              value={value.customTo}
              onChange={(e) => onChange({ ...value, customTo: e.target.value })}
              className={inputClass}
            />
          </>
        )}
      </div>
    </div>
  )
}

export function PeriodComparison({ baseFilters }: { baseFilters: Filters }) {
  const { t, tCountry, locale } = useLocale()
  const supabase = useMemo(() => createClient(), [])

  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return [y - 4, y - 3, y - 2, y - 1, y, y + 1]
  }, [])

  const [selected, setSelected] = useState<RangeSelection>(() => defaultSelection(1))
  const [comparison, setComparison] = useState<RangeSelection>(() => defaultSelection(0))

  const adjusted = useMemo(() => {
    return adjustRangesForToday(resolveRange(selected), resolveRange(comparison))
  }, [selected, comparison])
  const primary = adjusted.selected
  const compareRange = adjusted.comparison

  const qPrefix = t('dashboard.periodComparison.quarterPrefix')
  const selectedLabel = rangeLabel(selected, locale, qPrefix)
  const comparisonLabel = rangeLabel(comparison, locale, qPrefix)

  const [rows, setRows] = useState<PeriodComparisonRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getPeriodComparison(supabase, baseFilters, primary, compareRange)
      .then((r) => {
        if (!cancelled) {
          setRows(r)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRows([])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [supabase, baseFilters, primary, compareRange])

  const numFmt = new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : 'en-US')

  return (
    <div className="glass-card">
      <h3 className="mb-1 text-base font-semibold tracking-tight">
        {t('dashboard.periodComparison.title')}
      </h3>
      <p className="mb-4 text-xs text-[var(--text-secondary)]">
        {t('dashboard.periodComparison.subtitle')}
      </p>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <PeriodPicker
          label={t('dashboard.periodComparison.selected')}
          value={selected}
          onChange={setSelected}
          years={years}
        />
        <PeriodPicker
          label={t('dashboard.periodComparison.comparison')}
          value={comparison}
          onChange={setComparison}
          years={years}
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--text-secondary)]">
        <span>
          <span className="font-medium text-[var(--text-primary)]">{selectedLabel}:</span>{' '}
          {primary.from} → {primary.to}
        </span>
        <span>
          <span className="font-medium text-[var(--text-primary)]">{comparisonLabel}:</span>{' '}
          {compareRange.from} → {compareRange.to}
        </span>
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-[var(--gme-radius-sm)]" />
      ) : !rows || rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-[var(--text-secondary)]">
          {t('dashboard.periodComparison.noData')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-2 text-left font-medium text-[var(--text-secondary)]">
                  {t('dashboard.periodComparison.country')}
                </th>
                <th className="pb-2 pl-6 text-left font-medium text-[var(--text-secondary)]">
                  {selectedLabel}
                </th>
                <th className="pb-2 pl-6 text-left font-medium text-[var(--text-secondary)]">
                  {comparisonLabel}
                </th>
                <th className="pb-2 pl-6 text-left font-medium text-[var(--text-secondary)]">
                  {t('dashboard.periodComparison.delta')}
                </th>
                <th className="pb-2 pl-6 text-left font-medium text-[var(--text-secondary)]">
                  {t('dashboard.periodComparison.deltaPct')}
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const totalPrimary = rows.reduce((acc, r) => acc + r.primaryCases, 0)
                const totalComparison = rows.reduce((acc, r) => acc + r.comparisonCases, 0)
                const totalDelta = rows.reduce((acc, r) => acc + r.deltaCases, 0)
                const primaryIsLater = primary.from > compareRange.from
                const totalEarlier = primaryIsLater ? totalComparison : totalPrimary
                const totalDeltaPct = totalEarlier > 0 ? (totalDelta / totalEarlier) * 100 : null
                const up = totalDelta > 0
                const down = totalDelta < 0
                const cls = up ? 'metric-delta-up' : down ? 'metric-delta-down' : ''
                return (
                  <tr className="border-b-2 border-[var(--border)] font-semibold">
                    <td className="py-2 text-left">{t('dashboard.periodComparison.total')}</td>
                    <td className="py-2 pl-6 text-left tabular-nums">{numFmt.format(totalPrimary)}</td>
                    <td className="py-2 pl-6 text-left tabular-nums">{numFmt.format(totalComparison)}</td>
                    <td className={`py-2 pl-6 text-left tabular-nums ${cls}`}>
                      {up ? '+' : ''}{numFmt.format(totalDelta)}
                    </td>
                    <td className={`py-2 pl-6 text-left tabular-nums ${cls}`}>
                      {totalDeltaPct === null ? '—' : (
                        <span className="inline-flex items-center gap-1">
                          {up ? <TrendingUp className="h-3.5 w-3.5" />
                            : down ? <TrendingDown className="h-3.5 w-3.5" />
                            : null}
                          {up ? '+' : ''}{totalDeltaPct.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })()}
              {rows.map((r) => {
                const up = r.deltaCases > 0
                const down = r.deltaCases < 0
                const cls = up ? 'metric-delta-up' : down ? 'metric-delta-down' : ''
                return (
                  <tr key={r.country} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 text-left">{tCountry(r.country)}</td>
                    <td className="py-2 pl-6 text-left tabular-nums">{numFmt.format(r.primaryCases)}</td>
                    <td className="py-2 pl-6 text-left tabular-nums">{numFmt.format(r.comparisonCases)}</td>
                    <td className={`py-2 pl-6 text-left tabular-nums ${cls}`}>
                      {up ? '+' : ''}{numFmt.format(r.deltaCases)}
                    </td>
                    <td className={`py-2 pl-6 text-left tabular-nums ${cls}`}>
                      {r.deltaPct === null ? '—' : (
                        <span className="inline-flex items-center gap-1">
                          {up ? <TrendingUp className="h-3.5 w-3.5" />
                            : down ? <TrendingDown className="h-3.5 w-3.5" />
                            : null}
                          {up ? '+' : ''}{r.deltaPct.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
