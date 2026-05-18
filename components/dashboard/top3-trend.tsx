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

interface TooltipPayloadItem {
  dataKey: string
  value: number
  color: string
}
interface TooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipPayloadItem[]
}

export function Top3Trend({ months, countries, data }: Props) {
  const { t, tCountry } = useLocale()

  const chartData = months.map((month) => ({
    month,
    ...Object.fromEntries(countries.map((c) => [c, data[month]?.[c] ?? 0])),
  }))

  function CustomTooltip({ active, label, payload }: TooltipProps) {
    if (!active || !payload || !label) return null
    const sorted = [...payload].sort((a, b) => b.value - a.value)
    return (
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--gme-radius-sm)',
          padding: '8px 12px',
          fontSize: 12,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {sorted.map((p) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {tCountry(p.dataKey)} : {p.value}
          </div>
        ))}
      </div>
    )
  }

  return (
    <ChartCard title={t('dashboard.charts.top3Trend')}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
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
