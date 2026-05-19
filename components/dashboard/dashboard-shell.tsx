'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, subMonths, endOfMonth, startOfMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import {
  getKpiStrip,
  getCountryLeaderboard,
  getMonthlyTrendByNationality,
  getCountryShare,
  getTop3Trend,
  getCisVsNonCis,
  getMethodByMonth,
  getAvgDamageByCountry,
} from '@/lib/queries'
import { KpiStrip } from '@/components/dashboard/kpi-strip'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { TrendByNationality } from '@/components/dashboard/trend-by-nationality'
import { CountryShare } from '@/components/dashboard/country-share'
import { CountryTable } from '@/components/dashboard/country-table'
import { Top3Trend } from '@/components/dashboard/top3-trend'
import { CisAnalysis } from '@/components/dashboard/cis-analysis'
import { AvgDamage } from '@/components/dashboard/avg-damage'
import { MethodByMonth } from '@/components/dashboard/method-by-month'
import { CountryLeaderboard } from '@/components/dashboard/country-leaderboard'
import { PeriodComparison } from '@/components/dashboard/period-comparison'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocale } from '@/contexts/locale-context'
import type {
  Filters,
  KpiData,
  CountryLeaderboardRow,
  CountryShareRow,
  CisRow,
  AvgDamageRow,
} from '@/lib/types'

function defaultFilters(): Filters {
  const lastCompleteMonthEnd = endOfMonth(subMonths(new Date(), 1))
  const sixMonthsAgo = startOfMonth(subMonths(lastCompleteMonthEnd, 5))
  return {
    dateFrom: format(sixMonthsAgo, 'yyyy-MM-dd'),
    dateTo: format(lastCompleteMonthEnd, 'yyyy-MM-dd'),
    dateBasis: 'report_date',
    nationalities: [],
    channels: [],
    transactionMethods: [],
  }
}

interface ChartData {
  leaderboard: CountryLeaderboardRow[]
  trend: { months: string[]; countries: string[]; data: Record<string, Record<string, number>> }
  share: CountryShareRow[]
  top3: { months: string[]; countries: string[]; data: Record<string, Record<string, number>> }
  methodByMonth: {
    months: string[]
    categories: string[]
    data: Record<string, Record<string, number>>
    breakdown: Record<string, Record<string, Record<string, number>>>
  }
  cis: CisRow[]
  avgDamage: AvgDamageRow[]
}

export function DashboardShell({
  nationalities,
  channels,
  transactionMethods,
}: {
  nationalities: string[]
  channels: string[]
  transactionMethods: string[]
}) {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [charts, setCharts] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { t } = useLocale()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [kpiData, leaderboard, trend, share, top3, methodByMonth, cis, avgDamage] = await Promise.all([
      getKpiStrip(supabase, filters),
      getCountryLeaderboard(supabase, filters),
      getMonthlyTrendByNationality(supabase, filters),
      getCountryShare(supabase, filters),
      getTop3Trend(supabase, filters),
      getMethodByMonth(supabase, filters),
      getCisVsNonCis(supabase, filters),
      getAvgDamageByCountry(supabase, filters),
    ])
    setKpi(kpiData)
    setCharts({ leaderboard, trend, share, top3, methodByMonth, cis, avgDamage })
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="dashboard-title text-3xl">{t('dashboard.title')}</h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--gme-radius)]" />
          ))}
        </div>
      ) : kpi ? (
        <KpiStrip data={kpi} dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
      ) : null}

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        nationalities={nationalities}
        channels={channels}
        transactionMethods={transactionMethods}
      />

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-96 rounded-[var(--gme-radius)]" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-[var(--gme-radius)]" />
          ))}
        </div>
      ) : charts ? (
        <>
          <CountryLeaderboard
            data={charts.leaderboard}
            latestMonth={kpi?.latestMonth ?? null}
            previousMonth={kpi?.previousMonth ?? null}
          />

          <PeriodComparison baseFilters={filters} />

          <TrendByNationality
            months={charts.trend.months}
            countries={charts.trend.countries}
            data={charts.trend.data}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <CountryShare data={charts.share} />
            <CountryTable data={charts.share} />
          </div>

          <Top3Trend
            months={charts.top3.months}
            countries={charts.top3.countries}
            data={charts.top3.data}
          />

          <MethodByMonth
            months={charts.methodByMonth.months}
            categories={charts.methodByMonth.categories}
            data={charts.methodByMonth.data}
            breakdown={charts.methodByMonth.breakdown}
          />

          <CisAnalysis data={charts.cis} />

          <AvgDamage data={charts.avgDamage} />
        </>
      ) : null}
    </div>
  )
}
