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
    q = q.in('transaction_method', filters.transactionMethods)
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
    return { totalCases: totalCases ?? 0, latestMonthCases: 0, topCountry: '—', momChange: null }
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
  const latestMonthCases = byMonth.get(latestMonth) ?? 0

  let momChange: number | null = null
  if (sortedMonths.length >= 2) {
    const prevCases = byMonth.get(sortedMonths[sortedMonths.length - 2]) ?? 0
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

  return { totalCases: totalCases ?? 0, latestMonthCases, topCountry, momChange }
}

// ─── Country Leaderboard ─────────────────────────────────────

export async function getCountryLeaderboard(
  supabase: SupabaseClient,
  filters: Filters
): Promise<CountryLeaderboardRow[]> {
  const { data: rows } = await applyFilters(
    supabase.from('phishing_reports').select('sender_nationality, deposit_amount_krw, transaction_method, report_date, deposit_date'),
    filters
  )

  if (!rows || rows.length === 0) return []

  const col = filters.dateBasis

  // Gather all months and per-country aggregates
  const allMonths = new Set<string>()
  const countries = new Map<
    string,
    { total: number; sumKrw: number; byMonth: Map<string, number>; byMethod: Map<string, number> }
  >()

  for (const r of rows) {
    const dateVal = r[col] as string | null
    if (!dateVal) continue
    const month = dateVal.slice(0, 7)
    allMonths.add(month)
    const nat = r.sender_nationality as string
    const amt = Number(r.deposit_amount_krw) || 0

    if (!countries.has(nat)) countries.set(nat, { total: 0, sumKrw: 0, byMonth: new Map(), byMethod: new Map() })
    const c = countries.get(nat)!
    c.total++
    c.sumKrw += amt
    c.byMonth.set(month, (c.byMonth.get(month) ?? 0) + 1)
    const method = (r.transaction_method as string) || 'Unknown'
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

    result.push({
      country,
      totalCases: agg.total,
      latestMonthCases,
      momChange,
      totalKrw: Math.round(agg.sumKrw),
      avgKrw: agg.total > 0 ? Math.round(agg.sumKrw / agg.total) : 0,
      primaryMethod,
      primaryMethodPct: agg.total > 0 ? (primaryMethodCount / agg.total) * 100 : 0,
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
): Promise<{ months: string[]; methods: string[]; data: Record<string, Record<string, number>> }> {
  const { data: rows } = await applyFilters(
    supabase.from('phishing_reports').select('transaction_method, report_date, deposit_date'),
    filters
  )
  if (!rows) return { months: [], methods: [], data: {} }

  const col = filters.dateBasis
  const countMap = new Map<string, Map<string, number>>()
  const methodSet = new Set<string>()

  for (const r of rows) {
    const dateVal = r[col] as string | null
    if (!dateVal) continue
    const month = dateVal.slice(0, 7)
    const method = (r.transaction_method as string) || 'Unknown'
    methodSet.add(method)
    if (!countMap.has(month)) countMap.set(month, new Map())
    const m = countMap.get(month)!
    m.set(method, (m.get(method) ?? 0) + 1)
  }

  const months = [...countMap.keys()].sort()
  const methods = [...methodSet]
  const data: Record<string, Record<string, number>> = {}

  for (const month of months) {
    data[month] = {}
    const m = countMap.get(month)!
    for (const method of methods) {
      data[month][method] = m.get(method) ?? 0
    }
  }

  return { months, methods, data }
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
