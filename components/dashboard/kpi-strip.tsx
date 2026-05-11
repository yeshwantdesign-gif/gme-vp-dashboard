'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import type { KpiData } from '@/lib/types'

function KpiCard({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="glass-card flex flex-col gap-1">
      <span className="metric-label">{label}</span>
      <div className="metric-value">{value}</div>
    </div>
  )
}

export function KpiStrip({ data }: { data: KpiData }) {
  const { locale, t, tCountry } = useLocale()
  const fmt = new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : 'en-US')

  const momUp = data.momChange !== null && data.momChange > 0
  const momClass = data.momChange !== null
    ? (momUp ? 'metric-delta-up' : 'metric-delta-down')
    : ''

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label={t('dashboard.kpi.periodTotal')}
        value={fmt.format(data.totalCases)}
      />
      <KpiCard
        label={t('dashboard.kpi.latestMonth')}
        value={fmt.format(data.latestMonthCases)}
      />
      <KpiCard
        label={t('dashboard.kpi.topSourceCountry')}
        value={tCountry(data.topCountry)}
      />
      <KpiCard
        label={t('dashboard.kpi.monthOverMonth')}
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
