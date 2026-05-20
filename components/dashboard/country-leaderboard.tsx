'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/locale-context'
import { methodToCategory } from '@/lib/method-categories'
import { riskTier, RISK_TIER_BADGE_CLASS } from '@/lib/risk-tier'
import type { CountryLeaderboardRow } from '@/lib/types'

type SortKey = keyof Pick<CountryLeaderboardRow, 'totalCases' | 'latestMonthCases' | 'momChange' | 'totalKrw' | 'avgKrw' | 'totalTxn' | 'ratePer1k'>
type SortDir = 'asc' | 'desc'

const DEFAULT_VISIBLE = 12

export function CountryLeaderboard({
  data,
  latestMonth,
  previousMonth,
}: {
  data: CountryLeaderboardRow[]
  latestMonth: string | null
  previousMonth: string | null
}) {
  const { locale, t, tCountry, tMethod, tMethodCategory } = useLocale()
  const shortMonthFmt = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', { month: 'short' })
  const momSuffix = latestMonth && previousMonth
    ? ` (${shortMonthFmt.format(new Date(`${latestMonth}-01T00:00:00`))} vs ${shortMonthFmt.format(new Date(`${previousMonth}-01T00:00:00`))})`
    : ''
  const [sortKey, setSortKey] = useState<SortKey>('totalCases')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showAll, setShowAll] = useState(false)

  const numFmt = new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : 'en-US')
  const krwFmt = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })

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

  const columns: { key: SortKey | 'country' | 'primaryMethod' | 'methodCategory' | 'riskTier'; label: string }[] = [
    { key: 'country', label: t('dashboard.leaderboard.country') },
    { key: 'totalCases', label: t('dashboard.leaderboard.totalCases') },
    { key: 'latestMonthCases', label: t('dashboard.leaderboard.latestMonth') },
    { key: 'momChange', label: `${t('dashboard.leaderboard.momChange')}${momSuffix}` },
    { key: 'totalKrw', label: t('dashboard.leaderboard.totalDamage') },
    { key: 'avgKrw', label: t('dashboard.leaderboard.avgDamage') },
    { key: 'totalTxn', label: t('dashboard.leaderboard.totalTxn') },
    { key: 'ratePer1k', label: t('dashboard.leaderboard.ratePer1k') },
    { key: 'riskTier', label: t('dashboard.leaderboard.riskTier') },
    { key: 'methodCategory', label: t('dashboard.transactionMethod') },
    { key: 'primaryMethod', label: t('dashboard.leaderboard.primaryMethod') },
  ]

  return (
    <div className="glass-card">
      <h3 className="mb-1 text-base font-semibold tracking-tight">{t('dashboard.leaderboard.title')}</h3>
      <p className="mb-4 text-xs text-[var(--text-secondary)]">
        {t('dashboard.leaderboard.riskNote')}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col, idx) => {
                const sortable = col.key !== 'country' && col.key !== 'primaryMethod' && col.key !== 'methodCategory' && col.key !== 'riskTier'
                return (
                  <th
                    key={col.key}
                    className={`pb-2 text-left font-medium text-[var(--text-secondary)] ${idx > 0 ? 'pl-6' : ''} ${sortable ? 'cursor-pointer select-none hover:text-[var(--text-primary)]' : ''}`}
                    onClick={sortable ? () => handleSort(col.key as SortKey) : undefined}
                  >
                    {col.label}
                    {sortable && <SortIcon col={col.key as SortKey} />}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const totalCases = sorted.reduce((acc, r) => acc + r.totalCases, 0)
              const totalLatest = sorted.reduce((acc, r) => acc + r.latestMonthCases, 0)
              const totalKrw = sorted.reduce((acc, r) => acc + r.totalKrw, 0)
              const totalTxn = sorted.reduce((acc, r) => acc + (r.totalTxn ?? 0), 0)
              const avgKrw = totalCases > 0 ? Math.round(totalKrw / totalCases) : 0
              const overallRate = totalTxn > 0 ? (totalCases / totalTxn) * 1000 : null
              const overallPct = totalTxn > 0 ? (totalCases / totalTxn) * 100 : null
              const tier = riskTier(overallRate)
              return (
                <tr className="border-b-2 border-[var(--border)] font-semibold">
                  <td className="py-2 text-left">{t('dashboard.leaderboard.total')}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{numFmt.format(totalCases)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{numFmt.format(totalLatest)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums text-[var(--text-muted)]">—</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{krwFmt.format(totalKrw)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{krwFmt.format(avgKrw)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">
                    {totalTxn === 0 ? '—' : numFmt.format(totalTxn)}
                  </td>
                  <td className="py-2 pl-6 text-left tabular-nums">
                    {overallRate === null ? '—' : (
                      <span>
                        {overallRate.toFixed(2)}
                        <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                          ({overallPct!.toFixed(2)}%)
                        </span>
                      </span>
                    )}
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
              const momUp = row.momChange !== null && row.momChange > 0
              const momClass = row.momChange !== null
                ? (momUp ? 'metric-delta-up' : 'metric-delta-down')
                : ''

              return (
                <tr key={row.country} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 text-left">
                    {rank !== null && (
                      <span className="mr-2 text-xs text-[var(--text-muted)] tabular-nums">{rank}</span>
                    )}
                    {tCountry(row.country)}
                  </td>
                  <td className="py-2 pl-6 text-left tabular-nums">{numFmt.format(row.totalCases)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{numFmt.format(row.latestMonthCases)}</td>
                  <td className={`py-2 pl-6 text-left tabular-nums ${momClass}`}>
                    {row.momChange !== null ? (
                      <span className="inline-flex items-center gap-1">
                        {momUp
                          ? <TrendingUp className="h-3.5 w-3.5" />
                          : <TrendingDown className="h-3.5 w-3.5" />}
                        {momUp ? '+' : ''}{row.momChange.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 pl-6 text-left tabular-nums">{krwFmt.format(row.totalKrw)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">{krwFmt.format(row.avgKrw)}</td>
                  <td className="py-2 pl-6 text-left tabular-nums">
                    {row.totalTxn === null ? '—' : numFmt.format(row.totalTxn)}
                  </td>
                  <td className="py-2 pl-6 text-left tabular-nums">
                    {row.ratePer1k === null ? '—' : (
                      <span>
                        {row.ratePer1k.toFixed(2)}
                        <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                          ({(row.ratePer1k / 10).toFixed(2)}%)
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="py-2 pl-6 text-left">
                    {(() => {
                      const tier = riskTier(row.ratePer1k)
                      return (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RISK_TIER_BADGE_CLASS[tier]}`}>
                          {t(`dashboard.riskTiers.${tier}`)}
                        </span>
                      )
                    })()}
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
