'use client'

import { ChartCard } from '@/components/shared/chart-card'
import { useLocale } from '@/contexts/locale-context'
import type { CountryShareRow } from '@/lib/types'

export function CountryTable({ data }: { data: CountryShareRow[] }) {
  const { locale, t, tCountry } = useLocale()
  const fmt = new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : 'en-US')

  return (
    <ChartCard title={t('dashboard.charts.countryBreakdown')}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="pb-2 text-left font-medium text-[var(--text-secondary)]">
              {t('dashboard.charts.country')}
            </th>
            <th className="pb-2 text-right font-medium text-[var(--text-secondary)]">
              {t('dashboard.charts.cases')}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.country} className="border-b border-[var(--border)] last:border-0">
              <td className="py-2">{tCountry(row.country)}</td>
              <td className="py-2 text-right tabular-nums">{fmt.format(row.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ChartCard>
  )
}
