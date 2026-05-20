export type RiskTier = 'critical' | 'high' | 'medium' | 'low' | 'unknown'

// Phishing KRW as % of overseas remittance KRW for the period
const CRITICAL = 1.0
const HIGH = 0.3
const MEDIUM = 0.1

export function riskTier(pct: number | null): RiskTier {
  if (pct == null || !isFinite(pct)) return 'unknown'
  if (pct >= CRITICAL) return 'critical'
  if (pct >= HIGH) return 'high'
  if (pct >= MEDIUM) return 'medium'
  return 'low'
}

export const RISK_TIER_BADGE_CLASS: Record<RiskTier, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  high:     'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  medium:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  low:      'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  unknown:  'bg-[var(--surface)] text-[var(--text-muted)]',
}
