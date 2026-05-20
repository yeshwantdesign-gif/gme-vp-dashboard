import { SupabaseClient } from '@supabase/supabase-js'
import type {
  Filters,
  KpiData,
  CountryLeaderboardRow,
  CountryShareRow,
  CisRow,
  AvgDamageRow,
  CountryRuleset,
} from './types'
import {
  METHOD_CATEGORY_IDS,
  methodToCategory,
  expandCategoriesToMethods,
  type MethodCategoryId,
} from './method-categories'
import type { DateRange, PeriodComparisonRow } from './period-comparison'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(
  query: any,
  filters: Filters
) {
  const col = filters.dateBasis
  let q = query.gte(col, filters.dateFrom).lte(col, filters.dateTo)
  if (filters.nationalities.length > 0) {
    q = q.in('sender_nationality', filters.nationalities)
  }
  if (filters.channels.length > 0) {
    q = q.in('deposit_channel', filters.channels)
  }
  if (filters.transactionMethods.length > 0) {
    const raw = expandCategoriesToMethods(filters.transactionMethods)
    if (raw.length > 0) q = q.in('transaction_method', raw)
  }
  return q.range(0, 9999)
}

// ─── KPI Strip ───────────────────────────────────────────────

export async function getKpiStrip(
  supabase: SupabaseClient,
  filters: Filters
): Promise<KpiData> {
  const { count: totalCases } = await applyFilters(
    supabase.from('phishing_reports').select('id', { count: 'exact', head: true }),
    filters
  )

  const { data: rows } = await applyFilters(
    supabase.from('phishing_reports').select('sender_nationality, report_date, deposit_date'),
    filters
  )

  if (!rows || rows.length === 0) {
    return {
      totalCases: totalCases ?? 0,
      latestMonthCases: 0,
      latestMonth: null,
      previousMonth: null,
      topCountry: '—',
      momChange: null,
    }
  }

  const col = filters.dateBasis
  const byMonth = new Map<string, number>()
  const byCountry = new Map<string, number>()

  for (const r of rows) {
    const dateVal = r[col] as string | null
    if (!dateVal) continue
    const month = dateVal.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1)
    const nat = r.sender_nationality as string
    byCountry.set(nat, (byCountry.get(nat) ?? 0) + 1)
  }

  const sortedMonths = [...byMonth.keys()].sort()
  const latestMonth = sortedMonths[sortedMonths.length - 1]
  const previousMonth = sortedMonths.length >= 2 ? sortedMonths[sortedMonths.length - 2] : null
  const latestMonthCases = byMonth.get(latestMonth) ?? 0

  let momChange: number | null = null
  if (previousMonth) {
    const prevCases = byMonth.get(previousMonth) ?? 0
    if (prevCases > 0) {
      momChange = ((latestMonthCases - prevCases) / prevCases) * 100
    }
  }

  let topCountry = '—'
  let topCount = 0
  for (const [country, count] of byCountry) {
    if (count > topCount) {
      topCount = count
      topCountry = country
    }
  }

  return {
    totalCases: totalCases ?? 0,
    latestMonthCases,
    latestMonth: latestMonth ?? null,
    previousMonth,
    topCountry,
    momChange,
  }
}

// ─── Country Leaderboard ─────────────────────────────────────

async function getRemittanceTotalsByCountry(
  supabase: SupabaseClient,
  dateFrom: string,
  dateTo: string,
): Promise<Map<string, { totalAmountKrw: number }>> {
  // Include every monthly bucket overlapping the filter range.
  // (Filter ranges that don't align to month boundaries will fold in the
  // full month — acceptable approximation given data is monthly-aggregated.)
  const fromMonth = dateFrom.slice(0, 7)
  const toMonth = dateTo.slice(0, 7)
  const { data } = await supabase
    .from('country_remittance_monthly')
    .select('country, total_amount_krw')
    .gte('month', fromMonth)
    .lte('month', toMonth)
  const map = new Map<string, { totalAmountKrw: number }>()
  for (const r of data ?? []) {
    const c = r.country as string
    const amt = Number(r.total_amount_krw) || 0
    const prev = map.get(c) ?? { totalAmountKrw: 0 }
    map.set(c, { totalAmountKrw: prev.totalAmountKrw + amt })
  }
  return map
}

export async function getCountryLeaderboard(
  supabase: SupabaseClient,
  filters: Filters
): Promise<CountryLeaderboardRow[]> {
  const [{ data: rows }, remittance] = await Promise.all([
    applyFilters(
      supabase.from('phishing_reports').select('sender_nationality, deposit_amount_krw, transaction_method, report_date, deposit_date'),
      filters,
    ),
    getRemittanceTotalsByCountry(supabase, filters.dateFrom, filters.dateTo),
  ])

  if (!rows || rows.length === 0) return []

  const col = filters.dateBasis

  // Gather all months and per-country aggregates
  const allMonths = new Set<string>()
  const countries = new Map<
    string,
    {
      total: number
      sumKrw: number
      overseasPhishingKrw: number
      byMonth: Map<string, number>
      byMethod: Map<string, number>
    }
  >()

  for (const r of rows) {
    const dateVal = r[col] as string | null
    if (!dateVal) continue
    const month = dateVal.slice(0, 7)
    allMonths.add(month)
    const nat = r.sender_nationality as string
    const amt = Number(r.deposit_amount_krw) || 0
    const method = (r.transaction_method as string) || 'Unknown'

    if (!countries.has(nat)) {
      countries.set(nat, {
        total: 0,
        sumKrw: 0,
        overseasPhishingKrw: 0,
        byMonth: new Map(),
        byMethod: new Map(),
      })
    }
    const c = countries.get(nat)!
    c.total++
    c.sumKrw += amt
    if (methodToCategory(method) === 'OVERSEAS') {
      c.overseasPhishingKrw += amt
    }
    c.byMonth.set(month, (c.byMonth.get(month) ?? 0) + 1)
    c.byMethod.set(method, (c.byMethod.get(method) ?? 0) + 1)
  }

  const sortedMonths = [...allMonths].sort()
  const latestMonth = sortedMonths[sortedMonths.length - 1]
  const prevMonth = sortedMonths.length >= 2 ? sortedMonths[sortedMonths.length - 2] : null

  const result: CountryLeaderboardRow[] = []

  for (const [country, agg] of countries) {
    const latestMonthCases = agg.byMonth.get(latestMonth) ?? 0
    let momChange: number | null = null
    if (prevMonth) {
      const prevCases = agg.byMonth.get(prevMonth) ?? 0
      if (prevCases > 0) {
        momChange = ((latestMonthCases - prevCases) / prevCases) * 100
      }
    }

    // Find primary transaction method
    let primaryMethod = 'Unknown'
    let primaryMethodCount = 0
    for (const [m, cnt] of agg.byMethod) {
      if (cnt > primaryMethodCount) {
        primaryMethodCount = cnt
        primaryMethod = m
      }
    }

    const remit = remittance.get(country)
    const overseasTotalKrw = remit ? remit.totalAmountKrw : null
    const overseasPhishingKrw = Math.round(agg.overseasPhishingKrw)
    const overseasPhishingPct =
      overseasTotalKrw && overseasTotalKrw > 0
        ? (overseasPhishingKrw / overseasTotalKrw) * 100
        : null

    result.push({
      country,
      totalCases: agg.total,
      latestMonthCases,
      momChange,
      totalKrw: Math.round(agg.sumKrw),
      avgKrw: agg.total > 0 ? Math.round(agg.sumKrw / agg.total) : 0,
      primaryMethod,
      primaryMethodPct: agg.total > 0 ? (primaryMethodCount / agg.total) * 100 : 0,
      overseasTotalKrw,
      overseasPhishingKrw,
      overseasPhishingPct,
    })
  }

  return result.sort((a, b) => b.totalCases - a.totalCases)
}

// ─── Monthly Trend by Nationality ────────────────────────────

export async function getMonthlyTrendByNationality(
  supabase: SupabaseClient,
  filters: Filters
): Promise<{ months: string[]; countries: string[]; data: Record<string, Record<string, number>> }> {
  const { data: rows } = await applyFilters(
    supabase.from('phishing_reports').select('sender_nationality, report_date, deposit_date'),
    filters
  )

  if (!rows) return { months: [], countries: [], data: {} }

  const col = filters.dateBasis
  const countMap = new Map<string, Map<string, number>>()
  const countryTotals = new Map<string, number>()

  for (const r of rows) {
    const dateVal = r[col] as string | null
    if (!dateVal) continue
    const month = dateVal.slice(0, 7)
    const nat = r.sender_nationality as string
    if (!countMap.has(month)) countMap.set(month, new Map())
    countMap.get(month)!.set(nat, (countMap.get(month)!.get(nat) ?? 0) + 1)
    countryTotals.set(nat, (countryTotals.get(nat) ?? 0) + 1)
  }

  const top6 = [...countryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([c]) => c)
  const countries = [...top6, 'Other']
  const months = [...countMap.keys()].sort()
  const data: Record<string, Record<string, number>> = {}

  for (const month of months) {
    data[month] = {}
    const m = countMap.get(month)!
    let other = 0
    for (const [nat, count] of m) {
      if (top6.includes(nat)) {
        data[month][nat] = count
      } else {
        other += count
      }
    }
    data[month]['Other'] = other
  }

  return { months, countries, data }
}

// ─── Country Share ───────────────────────────────────────────

export async function getCountryShare(
  supabase: SupabaseClient,
  filters: Filters
): Promise<CountryShareRow[]> {
  const { data: rows } = await applyFilters(
    supabase.from('phishing_reports').select('sender_nationality'),
    filters
  )
  if (!rows) return []

  const counts = new Map<string, number>()
  for (const r of rows) {
    const nat = r.sender_nationality as string
    counts.set(nat, (counts.get(nat) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([country, count]) => ({ country, count }))
}

// ─── Top 3 Trend ─────────────────────────────────────────────

export async function getTop3Trend(
  supabase: SupabaseClient,
  filters: Filters
): Promise<{ months: string[]; countries: string[]; data: Record<string, Record<string, number>> }> {
  const { data: rows } = await applyFilters(
    supabase.from('phishing_reports').select('sender_nationality, report_date, deposit_date'),
    filters
  )
  if (!rows) return { months: [], countries: [], data: {} }

  const col = filters.dateBasis
  const countryTotals = new Map<string, number>()
  const monthCountry = new Map<string, Map<string, number>>()

  for (const r of rows) {
    const dateVal = r[col] as string | null
    if (!dateVal) continue
    const month = dateVal.slice(0, 7)
    const nat = r.sender_nationality as string
    countryTotals.set(nat, (countryTotals.get(nat) ?? 0) + 1)
    if (!monthCountry.has(month)) monthCountry.set(month, new Map())
    monthCountry.get(month)!.set(nat, (monthCountry.get(month)!.get(nat) ?? 0) + 1)
  }

  const top3 = [...countryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c)

  const months = [...monthCountry.keys()].sort()
  const data: Record<string, Record<string, number>> = {}
  for (const month of months) {
    data[month] = {}
    const m = monthCountry.get(month)!
    for (const c of top3) {
      data[month][c] = m.get(c) ?? 0
    }
  }

  return { months, countries: top3, data }
}

// ─── CIS vs Non-CIS ─────────────────────────────────────────

export async function getCisVsNonCis(
  supabase: SupabaseClient,
  filters: Filters
): Promise<CisRow[]> {
  const { data: rows } = await applyFilters(
    supabase.from('phishing_reports').select('region_group, sender_nationality, report_date, deposit_date'),
    filters
  )
  if (!rows) return []

  const col = filters.dateBasis
  const byMonth = new Map<
    string,
    {
      cis: number
      nonCis: number
      cisCountries: Map<string, number>
      nonCisCountries: Map<string, number>
    }
  >()

  for (const r of rows) {
    const dateVal = r[col] as string | null
    if (!dateVal) continue
    const month = dateVal.slice(0, 7)
    if (!byMonth.has(month)) {
      byMonth.set(month, { cis: 0, nonCis: 0, cisCountries: new Map(), nonCisCountries: new Map() })
    }
    const m = byMonth.get(month)!
    const nat = r.sender_nationality as string
    if (r.region_group === 'CIS') {
      m.cis++
      m.cisCountries.set(nat, (m.cisCountries.get(nat) ?? 0) + 1)
    } else {
      m.nonCis++
      m.nonCisCountries.set(nat, (m.nonCisCountries.get(nat) ?? 0) + 1)
    }
  }

  function toSortedBreakdown(map: Map<string, number>) {
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([country, count]) => ({ country, count }))
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      cis: d.cis,
      nonCis: d.nonCis,
      cisBreakdown: toSortedBreakdown(d.cisCountries),
      nonCisBreakdown: toSortedBreakdown(d.nonCisCountries),
    }))
}

// ─── Transaction Method by Month ─────────────────────────────

export async function getMethodByMonth(
  supabase: SupabaseClient,
  filters: Filters
): Promise<{
  months: string[]
  categories: MethodCategoryId[]
  data: Record<string, Record<string, number>>
  breakdown: Record<string, Record<string, Record<string, number>>>
}> {
  const { data: rows } = await applyFilters(
    supabase.from('phishing_reports').select('transaction_method, report_date, deposit_date'),
    filters
  )
  if (!rows) {
    return { months: [], categories: METHOD_CATEGORY_IDS, data: {}, breakdown: {} }
  }

  const col = filters.dateBasis
  const totals = new Map<string, Map<MethodCategoryId, number>>()
  const detail = new Map<string, Map<MethodCategoryId, Map<string, number>>>()

  for (const r of rows) {
    const dateVal = r[col] as string | null
    if (!dateVal) continue
    const month = dateVal.slice(0, 7)
    const method = (r.transaction_method as string) || 'Unknown'
    const cat = methodToCategory(method)

    if (!totals.has(month)) totals.set(month, new Map())
    const t = totals.get(month)!
    t.set(cat, (t.get(cat) ?? 0) + 1)

    if (!detail.has(month)) detail.set(month, new Map())
    const d = detail.get(month)!
    if (!d.has(cat)) d.set(cat, new Map())
    const sub = d.get(cat)!
    sub.set(method, (sub.get(method) ?? 0) + 1)
  }

  const months = [...totals.keys()].sort()
  const data: Record<string, Record<string, number>> = {}
  const breakdown: Record<string, Record<string, Record<string, number>>> = {}

  for (const month of months) {
    data[month] = {}
    breakdown[month] = {}
    for (const cat of METHOD_CATEGORY_IDS) {
      data[month][cat] = totals.get(month)?.get(cat) ?? 0
      const sub = detail.get(month)?.get(cat)
      breakdown[month][cat] = sub ? Object.fromEntries(sub) : {}
    }
  }

  return { months, categories: METHOD_CATEGORY_IDS, data, breakdown }
}

// ─── Average Damage by Country ───────────────────────────────

export async function getAvgDamageByCountry(
  supabase: SupabaseClient,
  filters: Filters
): Promise<AvgDamageRow[]> {
  const { data: rows } = await applyFilters(
    supabase.from('phishing_reports').select('sender_nationality, deposit_amount_krw, report_date, deposit_date'),
    filters
  )
  if (!rows) return []

  const agg = new Map<string, { sum: number; count: number }>()
  for (const r of rows) {
    const nat = r.sender_nationality as string
    const amt = Number(r.deposit_amount_krw) || 0
    if (!agg.has(nat)) agg.set(nat, { sum: 0, count: 0 })
    const a = agg.get(nat)!
    a.sum += amt
    a.count++
  }

  return [...agg.entries()]
    .map(([country, { sum, count }]) => ({
      country,
      avg: count > 0 ? Math.round(sum / count) : 0,
      total: Math.round(sum),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
}

// ─── Country Primary Methods (all-time) ─────────────────────

export async function getCountryPrimaryMethods(
  supabase: SupabaseClient
): Promise<Record<string, { method: string; pct: number }>> {
  const { data: rows } = await supabase
    .from('phishing_reports')
    .select('sender_nationality, transaction_method')
    .range(0, 9999)

  if (!rows) return {}

  const countries = new Map<string, { total: number; byMethod: Map<string, number> }>()

  for (const r of rows) {
    const nat = r.sender_nationality as string
    const method = (r.transaction_method as string) || 'Unknown'
    if (!countries.has(nat)) countries.set(nat, { total: 0, byMethod: new Map() })
    const c = countries.get(nat)!
    c.total++
    c.byMethod.set(method, (c.byMethod.get(method) ?? 0) + 1)
  }

  const result: Record<string, { method: string; pct: number }> = {}

  for (const [country, agg] of countries) {
    let topMethod = 'Unknown'
    let topCount = 0
    for (const [m, cnt] of agg.byMethod) {
      if (cnt > topCount) {
        topCount = cnt
        topMethod = m
      }
    }
    result[country] = {
      method: topMethod,
      pct: agg.total > 0 ? (topCount / agg.total) * 100 : 0,
    }
  }

  return result
}

// ─── Country Rulesets ────────────────────────────────────────

export async function getCountryRulesets(
  supabase: SupabaseClient
): Promise<CountryRuleset[]> {
  const { data, error } = await supabase
    .from('country_rulesets')
    .select('*')
    .order('case_count', { ascending: false })

  if (error) throw error
  return (data ?? []) as CountryRuleset[]
}

// ─── Period Comparison ───────────────────────────────────────

export async function getPeriodComparison(
  supabase: SupabaseClient,
  baseFilters: Filters,
  primary: DateRange,
  comparison: DateRange,
): Promise<PeriodComparisonRow[]> {
  const select = 'sender_nationality, report_date, deposit_date'
  const primaryFilters: Filters = { ...baseFilters, dateFrom: primary.from, dateTo: primary.to }
  const comparisonFilters: Filters = { ...baseFilters, dateFrom: comparison.from, dateTo: comparison.to }

  const [primaryRes, comparisonRes] = await Promise.all([
    applyFilters(supabase.from('phishing_reports').select(select), primaryFilters),
    applyFilters(supabase.from('phishing_reports').select(select), comparisonFilters),
  ])

  const byCountry = new Map<string, { primary: number; comparison: number }>()

  for (const r of primaryRes.data ?? []) {
    const nat = r.sender_nationality as string
    if (!byCountry.has(nat)) byCountry.set(nat, { primary: 0, comparison: 0 })
    byCountry.get(nat)!.primary++
  }
  for (const r of comparisonRes.data ?? []) {
    const nat = r.sender_nationality as string
    if (!byCountry.has(nat)) byCountry.set(nat, { primary: 0, comparison: 0 })
    byCountry.get(nat)!.comparison++
  }

  // Difference is computed in chronological direction: (later period − earlier period).
  // So a positive Δ always means "cases went up over time" (= more phishing = bad/red),
  // regardless of which picker the user put the newer period in.
  const primaryIsLater = primary.from > comparison.from

  return [...byCountry.entries()]
    .map(([country, agg]) => {
      const later = primaryIsLater ? agg.primary : agg.comparison
      const earlier = primaryIsLater ? agg.comparison : agg.primary
      return {
        country,
        primaryCases: agg.primary,
        comparisonCases: agg.comparison,
        deltaCases: later - earlier,
        deltaPct: earlier > 0 ? ((later - earlier) / earlier) * 100 : null,
      }
    })
    .filter((r) => r.primaryCases > 0 || r.comparisonCases > 0)
    .sort((a, b) => b.primaryCases - a.primaryCases)
}
