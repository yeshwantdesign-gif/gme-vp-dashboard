'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ChartCard } from '@/components/shared/chart-card'
import { useLocale } from '@/contexts/locale-context'
import type { AvgDamageRow } from '@/lib/types'

const krwFmt = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })

export function AvgDamage({ data }: { data: AvgDamageRow[] }) {
  const { t, tCountry } = useLocale()

  const localizedData = data.map((row) => ({
    ...row,
    displayCountry: tCountry(row.country),
  }))

  return (
    <ChartCard title={t('dashboard.charts.avgDamage')}>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
        <BarChart data={localizedData} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => krwFmt.format(v)}
          />
          <YAxis type="category" dataKey="displayCountry" tick={{ fontSize: 12 }} width={75} />
          <Tooltip
            formatter={(value) => krwFmt.format(Number(value))}
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--gme-radius-sm)',
            }}
          />
          <Bar dataKey="avg" name={t('dashboard.charts.avgDamage')} fill="#2563eb" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
