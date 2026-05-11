'use client'

import { useLocale } from '@/contexts/locale-context'

export function RulesetsHeader({ count }: { count: number }) {
  const { t } = useLocale()

  return (
    <div>
      <h1 className="dashboard-title text-3xl">{t('rulesets.title')}</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {t('rulesets.subtitle', { count })}
      </p>
    </div>
  )
}
