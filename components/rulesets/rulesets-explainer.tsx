'use client'

import { useLocale } from '@/contexts/locale-context'

export function RulesetsExplainer() {
  const { t } = useLocale()

  return (
    <div className="glass-card space-y-3">
      <h3 className="text-base font-semibold">{t('rulesets.explainer.title')}</h3>
      <p className="text-sm text-[var(--text-secondary)]">
        {t('rulesets.explainer.intro')}
      </p>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-[var(--gme-radius-sm)] bg-[var(--surface)] px-3 py-2">
          {t('rulesets.explainer.coverage')}
        </div>
        <div className="rounded-[var(--gme-radius-sm)] bg-[var(--surface)] px-3 py-2">
          {t('rulesets.explainer.confidence')}
        </div>
        <div className="rounded-[var(--gme-radius-sm)] bg-[var(--surface)] px-3 py-2">
          {t('rulesets.explainer.score')}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
        <span className="text-[var(--accent-red)]">{t('rulesets.explainer.riskCritical')}</span>
        <span className="text-[var(--accent-amber)]">{t('rulesets.explainer.riskHigh')}</span>
        <span className="text-[var(--accent-blue)]">{t('rulesets.explainer.riskMedium')}</span>
        <span className="text-[var(--accent-green)]">{t('rulesets.explainer.riskLow')}</span>
      </div>
    </div>
  )
}
