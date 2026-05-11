'use client'

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '@/lib/chart-colors'
import { ChartCard } from '@/components/shared/chart-card'
import { useLocale } from '@/contexts/locale-context'
import type { CountryShareRow } from '@/lib/types'

export function CountryShare({ data }: { data: CountryShareRow[] }) {
  const { t, tCountry } = useLocale()

  return (
    <ChartCard title={t('dashboard.charts.countryShare')}>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="country"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            label={(props: { name?: string; percent?: number }) =>
              `${tCountry(props.name ?? '')} ${((props.percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [value, tCountry(String(name))]}
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--gme-radius-sm)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
