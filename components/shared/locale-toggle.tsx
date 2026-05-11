'use client'

import { useLocale } from '@/contexts/locale-context'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/translations'

const locales: Locale[] = ['en', 'ko']

export function LocaleToggle() {
  const { locale, setLocale, t } = useLocale()

  return (
    <div className="flex items-center rounded-[var(--gme-radius-sm)] border border-[var(--border)]">
      {locales.map((l, i) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            'px-2.5 py-1 text-xs font-medium transition-colors',
            i === 0 && 'rounded-l-[calc(var(--gme-radius-sm)-1px)]',
            i === locales.length - 1 && 'rounded-r-[calc(var(--gme-radius-sm)-1px)]',
            i > 0 && 'border-l border-[var(--border)]',
            locale === l
              ? 'bg-[var(--surface)] text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          )}
        >
          {t(`locale.${l}`)}
        </button>
      ))}
    </div>
  )
}
