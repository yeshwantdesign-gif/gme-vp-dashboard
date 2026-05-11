'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/locale-context'
import { formatRuleCondition } from '@/lib/format-rule'
import type { CountryRuleset } from '@/lib/types'

const fmt = new Intl.NumberFormat('en-US')
const krwFmt = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })

function formatCompact(val: number): string {
  if (val >= 1_000_000_000) return `₩${(val / 1_000_000_000).toFixed(1)}B`
  if (val >= 1_000_000) return `₩${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `₩${(val / 1_000).toFixed(0)}K`
  return krwFmt.format(val)
}

const riskBadgeVariant: Record<string, string> = {
  Critical: 'bg-[var(--accent-red)]/10 text-[var(--accent-red)] border-[var(--accent-red)]/20',
  High: 'bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] border-[var(--accent-amber)]/20',
  Medium: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-[var(--accent-blue)]/20',
  Low: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20',
}

export function CountryCard({
  ruleset,
  primaryMethod,
}: {
  ruleset: CountryRuleset
  primaryMethod: { method: string; pct: number } | null
}) {
  const [expanded, setExpanded] = useState(false)
  const { locale, t, tCountry, tMethod } = useLocale()

  const sortedRules = [...ruleset.rules].sort((a, b) => b.priority_score - a.priority_score)
  const top3 = sortedRules.slice(0, 3)

  const totalDamage = ruleset.amount_stats?.total_damage_krw ?? 0
  const avgAmount = ruleset.amount_stats?.avg_amount_krw ?? 0

  return (
    <div className="glass-card space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{tCountry(ruleset.country)}</h3>
            <Badge
              variant="outline"
              className={riskBadgeVariant[ruleset.risk_level] ?? ''}
            >
              {t(`rulesets.risk.${ruleset.risk_level}`)}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
            <span>{fmt.format(ruleset.case_count)} {t('rulesets.cases')}</span>
            {totalDamage > 0 && <span>{formatCompact(totalDamage)}</span>}
            {ruleset.primary_age_group && <span>{t('rulesets.age')}: {ruleset.primary_age_group}</span>}
            {ruleset.primary_visa_type && <span>{t('rulesets.visa')}: {ruleset.primary_visa_type}</span>}
          </div>
        </div>
      </div>

      {/* Key patterns summary */}
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">{t('rulesets.keyPatterns')}</p>
        <ul className="space-y-1.5 text-sm">
          {top3.map((rule, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-blue)]" />
              <span>{formatRuleCondition(rule, t, tCountry, locale)}</span>
            </li>
          ))}
          {primaryMethod && (
            <li className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-violet)]" />
              <span>
                {t('rulesets.primaryMethod')}: {tMethod(primaryMethod.method)} ({primaryMethod.pct.toFixed(0)}%)
              </span>
            </li>
          )}
        </ul>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-[var(--gme-radius-sm)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-secondary)]">
        {totalDamage > 0 && (
          <span>{t('rulesets.totalExposure')}: <strong className="text-[var(--text-primary)]">{formatCompact(totalDamage)}</strong></span>
        )}
        {avgAmount > 0 && (
          <span>{t('rulesets.avgPerCase')}: <strong className="text-[var(--text-primary)]">{formatCompact(avgAmount)}</strong></span>
        )}
        <span>{t('dashboard.charts.cases')}: <strong className="text-[var(--text-primary)]">{fmt.format(ruleset.case_count)}</strong></span>
      </div>

      {/* Expanded rule table */}
      {expanded && (
        <div className="space-y-4">
          <div>
            <div className="grid grid-cols-[1fr_5rem_5rem_5rem] gap-2 border-b border-[var(--border)] pb-1 text-xs font-medium text-[var(--text-muted)]">
              <span>{t('rulesets.pattern')}</span>
              <span className="text-right">{t('rulesets.coverage')}</span>
              <span className="text-right">{t('rulesets.confidence')}</span>
              <span className="text-right">{t('rulesets.score')}</span>
            </div>
            {sortedRules.map((rule, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_5rem_5rem_5rem] items-center gap-2 border-b border-[var(--border)] py-2 text-sm last:border-0"
              >
                <span>{formatRuleCondition(rule, t, tCountry, locale)}</span>
                <span className="text-right tabular-nums">{(rule.coverage * 100).toFixed(0)}%</span>
                <span className="text-right tabular-nums">{(rule.confidence * 100).toFixed(0)}%</span>
                <span className="text-right tabular-nums font-medium">{rule.priority_score.toFixed(1)}</span>
              </div>
            ))}
          </div>

          {ruleset.amount_stats && (
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">{t('rulesets.amountStatistics')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(ruleset.amount_stats).map(([key, val]) => (
                  <div key={key} className="rounded-[var(--gme-radius-sm)] bg-[var(--surface)] px-3 py-2">
                    <span className="block text-xs text-[var(--text-muted)]">{key}</span>
                    <span className="text-sm font-semibold tabular-nums">{krwFmt.format(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ruleset.top_receivers && Object.keys(ruleset.top_receivers).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">{t('rulesets.topReceivers')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(ruleset.top_receivers)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between rounded-[var(--gme-radius-sm)] bg-[var(--surface)] px-3 py-2 text-sm">
                      <span className="truncate">{name}</span>
                      <span className="ml-2 tabular-nums font-medium">{fmt.format(count)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full"
      >
        {expanded ? (
          <>{t('rulesets.hidePatterns')} <ChevronUp className="ml-1 h-4 w-4" /></>
        ) : (
          <>{t('rulesets.viewPatterns')} <ChevronDown className="ml-1 h-4 w-4" /></>
        )}
      </Button>
    </div>
  )
}
