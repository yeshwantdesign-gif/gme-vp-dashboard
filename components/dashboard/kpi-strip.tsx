'use client'

import { useLocale } from '@/contexts/locale-context'
import { InfoTooltip } from '@/components/shared/info-tooltip'
import type { RiskMode } from '@/lib/risk-tier'
import type { KpiData } from '@/lib/types'

function KpiCard({
  label,
  sub,
  value,
  fullValue,
}: {
  label: string
  sub: string
  value: React.ReactNode
  /** Tooltip shown on hover — usually the un-abbreviated number. */
  fullValue?: string
}) {
  return (
    <div className="flex min-h-[120px] flex-col gap-1 rounded-[var(--gme-radius)] border border-[var(--border)] bg-background/40 p-4">
      <span className="metric-label">{label}</span>
      <span className="text-xs text-[var(--text-secondary)]">{sub}</span>
      <div className="metric-value mt-auto" title={fullValue}>
        {value}
      </div>
    </div>
  )
}

function ModeToggle({
  mode, onChange, t,
}: {
  mode: RiskMode
  onChange: (m: RiskMode) => void
  t: (key: string) => string
}) {
  const options: { value: RiskMode; label: string }[] = [
    { value: 'amount', label: t('dashboard.leaderboard.modeAmount') },
    { value: 'cases',  label: t('dashboard.leaderboard.modeCases') },
  ]
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-[var(--gme-radius-sm)] border border-[var(--border)] text-xs">
      {options.map((o) => {
        const active = o.value === mode
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={
              'px-3 py-1 transition-colors ' +
              (active
                ? 'bg-[var(--surface)] font-medium'
                : 'hover:bg-[var(--surface)] text-[var(--text-secondary)]')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function KpiStrip({
  data,
  dateFrom,
  dateTo,
  mode,
  onModeChange,
}: {
  data: KpiData
  dateFrom: string
  dateTo: string
  mode: RiskMode
  onModeChange: (m: RiskMode) => void
}) {
  const { locale, t } = useLocale()
  const intlLocale = locale === 'ko' ? 'ko-KR' : 'en-US'
  const numFmt = new Intl.NumberFormat(intlLocale)
  const krwFmtFull = new Intl.NumberFormat('ko-KR', {
    style: 'currency', currency: 'KRW', maximumFractionDigits: 0,
  })
  // Locale-aware compact notation: English → ₩6.1B, Korean → ₩61.2억
  const krwFmtCompact = new Intl.NumberFormat(intlLocale, {
    style: 'currency', currency: 'KRW',
    notation: 'compact', compactDisplay: 'short',
    maximumFractionDigits: 1,
  })
  const range = `${dateFrom} ${locale === 'ko' ? '~' : 'to'} ${dateTo}`

  const totalLabel = mode === 'amount'
    ? t('dashboard.kpi.totalAmount')
    : t('dashboard.kpi.totalCases')
  const overseasLabel = mode === 'amount'
    ? t('dashboard.kpi.overseasAmount')
    : t('dashboard.kpi.overseasCases')
  const domesticLabel = mode === 'amount'
    ? t('dashboard.kpi.domesticAmount')
    : t('dashboard.kpi.domesticCases')

  // For Cases mode, also show compact (e.g., 1.2K) — but case counts rarely
  // hit thousands here, so plain number is fine. Keep it readable either way.
  const totalValue = mode === 'amount' ? krwFmtCompact.format(data.totalKrw) : numFmt.format(data.totalCases)
  const totalFull  = mode === 'amount' ? krwFmtFull.format(data.totalKrw) : undefined

  const overseasValue = mode === 'amount' ? krwFmtCompact.format(data.overseasPhishingKrw) : numFmt.format(data.overseasPhishingCases)
  const overseasFull  = mode === 'amount' ? krwFmtFull.format(data.overseasPhishingKrw) : undefined

  const domesticValue = mode === 'amount' ? krwFmtCompact.format(data.domesticPhishingKrw) : numFmt.format(data.domesticPhishingCases)
  const domesticFull  = mode === 'amount' ? krwFmtFull.format(data.domesticPhishingKrw) : undefined

  return (
    <div className="glass-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">
          {t('dashboard.kpi.sectionTitle')}
        </h3>
        <div className="flex items-center gap-1.5">
          <ModeToggle mode={mode} onChange={onModeChange} t={t} />
          <InfoTooltip text={t('dashboard.leaderboard.modeTooltip')} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label={totalLabel} sub={`(${range})`} value={totalValue} fullValue={totalFull} />
        <KpiCard label={overseasLabel} sub={`(${range})`} value={overseasValue} fullValue={overseasFull} />
        <KpiCard label={domesticLabel} sub={`(${range})`} value={domesticValue} fullValue={domesticFull} />
      </div>
    </div>
  )
}
