export interface Filters {
  dateFrom: string
  dateTo: string
  dateBasis: 'report_date' | 'deposit_date'
  nationalities: string[]
  channels: string[]
  transactionMethods: string[]
}

export interface KpiData {
  totalCases: number
  totalKrw: number                       // all-method phishing KRW
  overseasPhishingCases: number
  overseasPhishingKrw: number
  domesticPhishingCases: number
  domesticPhishingKrw: number
  latestMonthCases: number
  latestMonth: string | null
  previousMonth: string | null
  topCountry: string
  momChange: number | null
}

export interface MonthlyNationalityRow {
  month: string
  [country: string]: string | number
}

export interface CountryLeaderboardRow {
  country: string
  totalCases: number
  latestMonthCases: number
  momChange: number | null
  totalKrw: number                       // total phishing amount (all methods)
  avgKrw: number
  primaryMethod: string
  primaryMethodPct: number
  overseasTotalKrw: number | null         // legitimate overseas remittance KRW for the period
  overseasPhishingKrw: number              // phishing KRW from overseas-category methods
  overseasPhishingPct: number | null       // overseasPhishingKrw / overseasTotalKrw * 100
  overseasTotalTxn: number | null          // legitimate overseas remittance transactions
  overseasPhishingCases: number            // phishing case count from overseas-category methods
  overseasPhishingCasePct: number | null   // overseasPhishingCases / overseasTotalTxn * 100
  domesticTotalKrw: number | null         // legitimate domestic transfer KRW
  domesticPhishingKrw: number              // phishing KRW from domestic-category methods
  domesticPhishingPct: number | null       // domesticPhishingKrw / domesticTotalKrw * 100
  domesticTotalTxn: number | null          // legitimate domestic transfer transactions
  domesticPhishingCases: number            // phishing case count from domestic-category methods
  domesticPhishingCasePct: number | null   // domesticPhishingCases / domesticTotalTxn * 100
}

export interface CountryShareRow {
  country: string
  count: number
}

export interface CisRow {
  month: string
  cis: number
  nonCis: number
  cisBreakdown: { country: string; count: number }[]
  nonCisBreakdown: { country: string; count: number }[]
}

export interface AvgDamageRow {
  country: string
  avg: number
  total: number
}

export interface CountryRuleset {
  country: string
  case_count: number
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low'
  primary_age_group: string | null
  primary_visa_type: string | null
  amount_stats: Record<string, number> | null
  top_receivers: Record<string, number> | null
  rules: Rule[]
}

export interface Rule {
  feature: string
  condition: string
  coverage: number
  confidence: number
  priority_score: number
}
