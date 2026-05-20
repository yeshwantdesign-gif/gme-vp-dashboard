export type RiskTier = 'critical' | 'high' | 'medium' | 'low' | 'unknown'

// Cases per 1,000 remittance transactions
const CRITICAL = 5
const HIGH = 2
const MEDIUM = 0.5

export function riskTier(ratePer1k: number | null): RiskTier {
  if (ratePer1k == null || !isFinite(ratePer1k)) return 'unknown'
  if (ratePer1k >= CRITICAL) return 'critical'
  if (ratePer1k >= HIGH) return 'high'
  if (ratePer1k >= MEDIUM) return 'medium'
  return 'low'
}

export const RISK_TIER_BADGE_CLASS: Record<RiskTier, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  high:     'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  medium:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  low:      'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  unknown:  'bg-[var(--surface)] text-[var(--text-muted)]',
}
