'use client'

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
  const range = `${dateFrom} ${locale === 'ko' ? '~' : 'to'} ${dateTo}`

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <KpiCard
        label={t('dashboard.kpi.periodTotal')}
        sub={`(${range})`}
        value={fmt.format(data.totalCases)}
      />
      <KpiCard
        label={t('dashboard.kpi.topSourceCountry')}
        sub={`(${range})`}
        value={tCountry(data.topCountry)}
      />
    </div>
  )
}
