export type RiskTier = 'critical' | 'high' | 'medium' | 'low' | 'unknown'
export type RiskMode = 'amount' | 'cases'

// Amount-based: % of overseas remittance KRW that was phishing
const AMOUNT_THRESHOLDS = { critical: 1.0, high: 0.3, medium: 0.1 }
// Cases-based: % of overseas remittance transactions that were phishing
const CASES_THRESHOLDS  = { critical: 0.5, high: 0.2, medium: 0.05 }

export function thresholdsFor(mode: RiskMode) {
  return mode === 'amount' ? AMOUNT_THRESHOLDS : CASES_THRESHOLDS
}

export function riskTier(pct: number | null, mode: RiskMode = 'amount'): RiskTier {
  if (pct == null || !isFinite(pct)) return 'unknown'
  const t = thresholdsFor(mode)
  if (pct >= t.critical) return 'critical'
  if (pct >= t.high) return 'high'
  if (pct >= t.medium) return 'medium'
  return 'low'
}

export const RISK_TIER_BADGE_CLASS: Record<RiskTier, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  high:     'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  medium:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  low:      'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  unknown:  'bg-[var(--surface)] text-[var(--text-muted)]',
}
