'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import type { KpiData } from '@/lib/types'

function KpiCard({
  label,
  sub,
  value,
}: {
  label: string
  sub: string
  value: React.ReactNode
}) {
  return (
    <div className="glass-card flex min-h-[140px] flex-col gap-1">
      <span className="metric-label">{label}</span>
      <span className="text-xs text-[var(--text-secondary)]">{sub}</span>
      <div className="metric-value mt-auto">{value}</div>
    </div>
  )
}

export function KpiStrip({
  data,
  dateFrom,
  dateTo,
}: {
  data: KpiData
  dateFrom: string
  dateTo: string
}) {
  const { locale, t, tCountry } = useLocale()
  const fmt = new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : 'en-US')
  const monthFmt = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', { month: 'long' })
  const shortMonthFmt = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', { month: 'short' })

  const range = `${dateFrom} ${locale === 'ko' ? '~' : 'to'} ${dateTo}`
  const lastMonthName = data.latestMonth
    ? monthFmt.format(new Date(`${data.latestMonth}-01T00:00:00`))
    : '—'
  const momLabel = data.latestMonth && data.previousMonth
    ? `${shortMonthFmt.format(new Date(`${data.latestMonth}-01T00:00:00`))} vs ${shortMonthFmt.format(new Date(`${data.previousMonth}-01T00:00:00`))}`
    : data.latestMonth
      ? `${shortMonthFmt.format(new Date(`${data.latestMonth}-01T00:00:00`))} ${locale === 'ko' ? '(이전 월 없음)' : '(no prior month)'}`
      : range

  const momUp = data.momChange !== null && data.momChange > 0
  const momClass = data.momChange !== null
    ? (momUp ? 'metric-delta-up' : 'metric-delta-down')
    : ''

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label={t('dashboard.kpi.periodTotal')}
        sub={`(${range})`}
        value={fmt.format(data.totalCases)}
      />
      <KpiCard
        label={t('dashboard.kpi.latestMonth')}
        sub={`(${lastMonthName})`}
        value={fmt.format(data.latestMonthCases)}
      />
      <KpiCard
        label={t('dashboard.kpi.topSourceCountry')}
        sub={`(${range})`}
        value={tCountry(data.topCountry)}
      />
      <KpiCard
        label={t('dashboard.kpi.monthOverMonth')}
        sub={`(${momLabel})`}
        value={
          data.momChange !== null ? (
            <span className={`flex items-center gap-1.5 ${momClass}`}>
              {momUp
                ? <TrendingUp className="h-5 w-5" />
                : <TrendingDown className="h-5 w-5" />}
              {momUp ? '+' : ''}{data.momChange.toFixed(1)}%
            </span>
          ) : '—'
        }
      />
    </div>
  )
}
