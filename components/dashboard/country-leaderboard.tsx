'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/locale-context'
import { methodToCategory } from '@/lib/method-categories'
import { riskTier, RISK_TIER_BADGE_CLASS, thresholdsFor, type RiskMode } from '@/lib/risk-tier'
import { InfoTooltip } from '@/components/shared/info-tooltip'
import type { CountryLeaderboardRow } from '@/lib/types'

type SortKey = keyof Pick<
  CountryLeaderboardRow,
  'totalCases' | 'totalKrw' | 'avgKrw'
  | 'overseasTotalKrw' | 'overseasPhishingKrw' | 'overseasPhishingPct'
  | 'overseasTotalTxn' | 'overseasPhishingCases' | 'overseasPhishingCasePct'
  | 'domesticTotalKrw' | 'domesticPhishingKrw' | 'domesticPhishingPct'
  | 'domesticTotalTxn' | 'domesticPhishingCases' | 'domesticPhishingCasePct'
>
type SortDir = 'asc' | 'desc'
type Scope = 'overseas' | 'domestic'

const DEFAULT_VISIBLE = 12
const SCOPE_STORAGE_KEY = 'leaderboard-scope'

export function CountryLeaderboard({
  data,
  mode,
  onModeChange,
}: {
  data: CountryLeaderboardRow[]
  mode: RiskMode
  onModeChange: (m: RiskMode) => void
}) {
  const { locale, t, tCountry, tMethod, tMethodCategory } = useLocale()
  const [sortKey, setSortKey] = useState<SortKey>('totalCases')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showAll, setShowAll] = useState(false)
  const [scope, setScope] = useState<Scope>('overseas')

  // Persist scope (mode is hoisted to dashboard-shell)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const s = window.localStorage.getItem(SCOPE_STORAGE_KEY)
    if (s === 'overseas' || s === 'domestic') setScope(s)
  }, [])
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(SCOPE_STORAGE_KEY, scope)
  }, [scope])

  const numFmt = new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : 'en-US')
  const krwFmt = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })

  // Scope + mode dependent column keys
  const scopeTotalKey: SortKey =
    scope === 'overseas'
      ? (mode === 'amount' ? 'overseasTotalKrw' : 'overseasTotalTxn')
      : (mode === 'amount' ? 'domesticTotalKrw' : 'domesticTotalTxn')
  const scopePhishingKey: SortKey =
    scope === 'overseas'
      ? (mode === 'amount' ? 'overseasPhishingKrw' : 'overseasPhishingCases')
      : (mode === 'amount' ? 'domesticPhishingKrw' : 'domesticPhishingCases')
  const scopePctKey: SortKey =
    scope === 'overseas'
      ? (mode === 'amount' ? 'overseasPhishingPct' : 'overseasPhishingCasePct')
      : (mode === 'amount' ? 'domesticPhishingPct' : 'domesticPhishingCasePct')

  // Labels for the three middle columns
  const totalLabelKey =
    scope === 'overseas'
      ? (mode === 'amount' ? 'overseasTotalKrw' : 'overseasTotalTxn')
      : (mode === 'amount' ? 'domesticTotalKrw' : 'domesticTotalTxn')
  const phishingLabelKey =
    scope === 'overseas'
      ? (mode === 'amount' ? 'overseasPhishingKrw' : 'overseasPhishingCases')
      : (mode === 'amount' ? 'domesticPhishingKrw' : 'domesticPhishingCases')
  const pctLabelKey =
    scope === 'overseas' ? 'overseasPhishingPct' : 'domesticPhishingPct'

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number)
    })
  }, [data, sortKey, sortDir])

  const visible = showAll ? sorted : sorted.slice(0, DEFAULT_VISIBLE)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 text-[var(--text-muted)]" />
    return sortDir === 'desc'
      ? <ChevronDown className="ml-1 inline h-3.5 w-3.5" />
      : <ChevronUp className="ml-1 inline h-3.5 w-3.5" />
  }

  type ColKey = SortKey | 'country' | 'primaryMethod' | 'methodCategory' | 'riskTier' | 'vpMix'
  const columns: { key: ColKey; label: string; tooltip?: string }[] = [
    { key: 'country', label: t('dashboard.leaderboard.country') },
    { key: 'totalCases', label: t('dashboard.leaderboard.totalCases') },
    { key: 'totalKrw', label: t('dashboard.leaderboard.totalDamage') },
    { key: 'avgKrw', label: t('dashboard.leaderboard.avgDamage') },
    { key: scopeTotalKey, label: t(`dashboard.leaderboard.${totalLabelKey}`) },
    { key: scopePhishingKey, label: t(`dashboard.leaderboard.${phishingLabelKey}`) },
    { key: scopePctKey, label: t(`dashboard.leaderboard.${pctLabelKey}`) },
    { key: 'vpMix', label: t('dashboard.leaderboard.vpMethodMix'), tooltip: t('dashboard.leaderboard.vpMethodMixTooltip') },
    { key: 'riskTier', label: t('dashboard.leaderboard.riskTier') },
    { key: 'methodCategory', label: t('dashboard.transactionMethod') },
    { key: 'primaryMethod', label: t('dashboard.leaderboard.primaryMethod') },
  ]

  // VP method mix % per row (scope-VP / period total). Always count-based —
  // it answers a method-composition question, not a financial-exposure one,
  // and counts make the share readable across countries.
  function vpMix(row: CountryLeaderboardRow): number | null {
    if (row.totalCases === 0) return null
    const numer = scope === 'overseas' ? row.overseasPhishingCases : row.domesticPhishingCases
    return (numer / row.totalCases) * 100
  }


  function renderScopeTotal(row: CountryLeaderboardRow) {
    if (scope === 'overseas') {
      if (mode === 'amount') {
        return row.overseasTotalKrw === null ? '—' : krwFmt.format(row.overseasTotalKrw)
      }
      return row.overseasTotalTxn === null ? '—' : numFmt.format(row.overseasTotalTxn)
    }
    if (mode === 'amount') {
      return row.domesticTotalKrw === null ? '—' : krwFmt.format(row.domesticTotalKrw)
    }
    return row.domesticTotalTxn === null ? '—' : numFmt.format(row.domesticTotalTxn)
  }
  function renderScopePhishing(row: CountryLeaderboardRow) {
    if (scope === 'overseas') {
      return mode === 'amount'
        ? krwFmt.format(row.overseasPhishingKrw)
        : numFmt.format(row.overseasPhishingCases)
    }
    return mode === 'amount'
      ? krwFmt.format(row.domesticPhishingKrw)
      : numFmt.format(row.domesticPhishingCases)
  }
  function rowPct(row: CountryLeaderboardRow): number | null {
    if (scope === 'overseas') {
      return mode === 'amount' ? row.overseasPhishingPct : row.overseasPhishingCasePct
    }
    return mode === 'amount' ? row.domesticPhishingPct : row.domesticPhishingCasePct
  }

  // Resolve the right risk note translation key for the scope + mode combo
  const riskNoteKey =
    scope === 'overseas'
      ? (mode === 'amount' ? 'riskNote' : 'riskNoteCases')
      : (mode === 'amount' ? 'riskNoteDomesticAmount' : 'riskNoteDomesticCases')

  return (
    <div className="glass-card">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">
          {t('dashboard.leaderboard.title')}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <ScopeToggle scope={scope} onChange={setScope} t={t} />
            <InfoTooltip text={t('dashboard.leaderboard.scopeTooltip')} />
          </div>
          <div className="flex items-center gap-1.5">
            <ModeToggle mode={mode} onChange={onModeChange} t={t} />
            <InfoTooltip text={t('dashboard.leaderboard.modeTooltip')} />
          </div>
        </div>
      </div>
      <p className="mb-2 text-xs text-[var(--text-secondary)]">
        {t(`dashboard.leaderboard.${riskNoteKey}`)}
      </p>
      <RiskTierLegend mode={mode} t={t} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col, idx) => {
                const sortable =
                  col.key !== 'country' &&
                  col.key !== 'primaryMethod' &&
                  col.key !== 'methodCategory' &&
                  col.key !== 'riskTier' &&
                  col.key !== 'vpMix'
                return (
                  <th
                    key={col.key}
                    className={`pb-2 text-left font-medium text-[var(--text-secondary)] ${idx > 0 ? 'pl-6' : ''} ${sortable ? 'cursor-pointer select-none hover:text-[var(--text-primary)]' : ''}`}
                    onClick={sortable ? () => handleSort(col.key as SortKey) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>{col.label}</span>
                      {col.tooltip && <InfoTooltip text={col.tooltip} />}
                      {sortable && <SortIcon col={col.key as SortKey} />}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const totalCases = sorted.reduce((acc, r) => acc + r.totalCases, 0)
              const totalKrw = sorted.reduce((acc, r) => acc + r.totalKrw, 0)
              const avgKrw = totalCases > 0 ? Math.round(totalKrw / totalCases) : 0
              const scopeTotalKrw = sorted.reduce(
                (acc, r) => acc + ((scope === 'overseas' ? r.overseasTotalKrw : r.domesticTotalKrw) ?? 0), 0)
              const scopeTotalTxn = sorted.reduce(
                (acc, r) => acc + ((scope === 'overseas' ? r.overseasTotalTxn : r.domesticTotalTxn) ?? 0), 0)
              const scopePhishingKrw = sorted.reduce(
                (acc, r) => acc + (scope === 'overseas' ? r.overseasPhishingKrw : r.domesticPhishingKrw), 0)
              const scopePhishingCases = sorted.reduce(
                (acc, r) => acc + (scope === 'overseas' ? r.overseasPhishingCases : r.domesticPhishingCases), 0)
              const pct = mode === 'amount'
                ? (scopeTotalKrw > 0 ? (scopePhishingKrw / scopeTotalKrw) * 100 : null)
                : (scopeTotalTxn > 0 ? (scopePhishingCases / scopeTotalTxn) * 100 : null)
              const tier = riskTier(pct, mode)
              const scopeTotalCell = mode === 'amount'
                ? (scopeTotalKrw === 0 ? '—' : krwFmt.format(scopeTotalKrw))
                : (scopeTotalTxn === 0 ? '—' : numFmt.format(scopeTotalTxn))
              const scopePhishingCell = mode === 'amount'
                ? krwFmt.format(scopePhishingKrw)
                : numFmt.format(scopePhishingCases)
              return (
                <tr className="border-b-2 border-[var(--border)] font-semibold">
                  <td className="py-2 text-left">{t('dashboard.leaderboard.total')}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{numFmt.format(totalCases)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{krwFmt.format(totalKrw)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{krwFmt.format(avgKrw)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{scopeTotalCell}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{scopePhishingCell}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">
                    {pct === null ? '—' : `${pct.toFixed(2)}%`}
                  </td>
                  <td className="py-2 pl-6 text-left tabular-nums">
                    {(() => {
                      const totalScopeCases = scope === 'overseas' ? scopePhishingCases : scopePhishingCases
                      // Note: scopePhishingCases above already reflects the active scope.
                      const mix = totalCases > 0 ? (totalScopeCases / totalCases) * 100 : null
                      return mix === null ? '—' : `${mix.toFixed(1)}%`
                    })()}
                  </td>
                  <td className="py-2 pl-6 text-left">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RISK_TIER_BADGE_CLASS[tier]}`}>
                      {t(`dashboard.riskTiers.${tier}`)}
                    </span>
                  </td>
                  <td className="py-2 pl-6 text-left text-[var(--text-muted)]">—</td>
                  <td className="py-2 pl-6 text-left text-[var(--text-muted)]">—</td>
                </tr>
              )
            })()}
            {visible.map((row, i) => {
              const rank = sortKey === 'totalCases' && sortDir === 'desc' ? i + 1 : null
              const pct = rowPct(row)
              const tier = riskTier(pct, mode)
              return (
                <tr key={row.country} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 text-left">
                    {rank !== null && (
                      <span className="mr-2 text-xs text-[var(--text-muted)] tabular-nums">{rank}</span>
                    )}
                    {tCountry(row.country)}
                  </td>
                  <td className="py-2 pl-6 text-left tabular-nums">{numFmt.format(row.totalCases)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{krwFmt.format(row.totalKrw)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{krwFmt.format(row.avgKrw)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{renderScopeTotal(row)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{renderScopePhishing(row)}</td>
                  <td className="py-2 pl-6 text-left font-semibold tabular-nums">
                    {pct === null ? '—' : `${pct.toFixed(2)}%`}
                  </td>
                  <td className="py-2 pl-6 text-left tabular-nums">
                    {(() => {
                      const mix = vpMix(row)
                      return mix === null ? '—' : `${mix.toFixed(1)}%`
                    })()}
                  </td>
                  <td className="py-2 pl-6 text-left">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RISK_TIER_BADGE_CLASS[tier]}`}>
                      {t(`dashboard.riskTiers.${tier}`)}
                    </span>
                  </td>
                  <td className="py-2 pl-6 text-left">
                    {tMethodCategory(methodToCategory(row.primaryMethod))}
                  </td>
                  <td className="py-2 pl-6 text-left">
                    {tMethod(row.primaryMethod)}
                    <span className="ml-1 text-xs text-[var(--text-muted)]">
                      {row.primaryMethodPct.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {data.length > DEFAULT_VISIBLE && (
        <div className="mt-3 text-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? t('dashboard.leaderboard.showLess') : t('dashboard.leaderboard.showAll')}
          </Button>
        </div>
      )}
    </div>
  )
}

function RiskTierLegend({
  mode, t,
}: {
  mode: RiskMode
  t: (key: string) => string
}) {
  const th = thresholdsFor(mode)
  const items: { tier: 'critical' | 'high' | 'medium' | 'low'; threshold: string }[] = [
    { tier: 'critical', threshold: `≥ ${th.critical}%` },
    { tier: 'high',     threshold: `≥ ${th.high}%` },
    { tier: 'medium',   threshold: `≥ ${th.medium}%` },
    { tier: 'low',      threshold: `< ${th.medium}%` },
  ]
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
      {items.map(({ tier, threshold }) => (
        <span
          key={tier}
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${RISK_TIER_BADGE_CLASS[tier]}`}
        >
          <span className="font-medium">{t(`dashboard.riskTiers.${tier}`)}</span>
          <span className="opacity-75">{threshold}</span>
        </span>
      ))}
    </div>
  )
}

function ScopeToggle({
  scope, onChange, t,
}: {
  scope: Scope
  onChange: (s: Scope) => void
  t: (key: string) => string
}) {
  const options: { value: Scope; label: string }[] = [
    { value: 'overseas', label: t('dashboard.leaderboard.scopeOverseas') },
    { value: 'domestic', label: t('dashboard.leaderboard.scopeDomestic') },
  ]
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-[var(--gme-radius-sm)] border border-[var(--border)] text-xs">
      {options.map((o) => {
        const active = o.value === scope
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
