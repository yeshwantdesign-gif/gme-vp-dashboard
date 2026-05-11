'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '@/lib/chart-colors'
import { ChartCard } from '@/components/shared/chart-card'
import { useLocale } from '@/contexts/locale-context'

interface Props {
  months: string[]
  countries: string[]
  data: Record<string, Record<string, number>>
}

export function Top3Trend({ months, countries, data }: Props) {
  const { t, tCountry } = useLocale()

  const chartData = months.map((month) => ({
    month,
    ...Object.fromEntries(countries.map((c) => [c, data[month]?.[c] ?? 0])),
  }))

  return (
    <ChartCard title={t('dashboard.charts.top3Trend')}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) => [value, tCountry(String(name))]}
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--gme-radius-sm)',
            }}
          />
          <Legend formatter={(value) => tCountry(value)} />
          {countries.map((country, i) => (
            <Line
              key={country}
              type="monotone"
              dataKey={country}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
