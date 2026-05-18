'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '@/lib/chart-colors'
import { ChartCard } from '@/components/shared/chart-card'
import { useLocale } from '@/contexts/locale-context'

interface Props {
  months: string[]
  categories: string[]
  data: Record<string, Record<string, number>>
  breakdown: Record<string, Record<string, Record<string, number>>>
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

export function MethodByMonth({ months, categories, data, breakdown }: Props) {
  const { t, tMethod, tMethodCategory } = useLocale()

  const chartData = months.map((month) => ({
    month,
    ...Object.fromEntries(categories.map((c) => [c, data[month]?.[c] ?? 0])),
  }))

  function CustomTooltip({ active, label, payload }: TooltipProps) {
    if (!active || !payload || !label) return null
    return (
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--gme-radius-sm)',
          padding: '8px 12px',
          fontSize: 12,
          minWidth: 180,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {payload.map((p) => {
          const cat = p.dataKey
          const sub = breakdown[label]?.[cat] ?? {}
          const entries = Object.entries(sub).filter(([, n]) => n > 0)
          return (
            <div key={cat} style={{ marginTop: 4 }}>
              <div style={{ color: p.color, fontWeight: 500 }}>
                {tMethodCategory(cat)}: {p.value}
              </div>
              {entries.length > 0 && (
                <div style={{ paddingLeft: 10, color: 'var(--text-secondary)' }}>
                  {entries.map(([method, n]) => (
                    <div key={method}>
                      {tMethod(method)}: {n}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <ChartCard title={t('dashboard.methodByMonthTitle')}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(value) => tMethodCategory(String(value))} />
          {categories.map((cat, i) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
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
