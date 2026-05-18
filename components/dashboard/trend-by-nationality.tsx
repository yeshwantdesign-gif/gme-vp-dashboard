'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { CHART_COLORS } from '@/lib/chart-colors'
import { ChartCard } from '@/components/shared/chart-card'
import { useLocale } from '@/contexts/locale-context'

interface Props {
  months: string[]
  countries: string[]
  data: Record<string, Record<string, number>>
}

type ViewMode = 'bar' | 'pie'

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

export function TrendByNationality({ months, countries, data }: Props) {
  const { t, tCountry } = useLocale()
  const [viewMode, setViewMode] = useState<ViewMode>('bar')

  const orderedCountries = useMemo(() => {
    const totals = new Map<string, number>()
    for (const c of countries) {
      let sum = 0
      for (const m of months) sum += data[m]?.[c] ?? 0
      totals.set(c, sum)
    }
    return [...countries].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0))
  }, [countries, months, data])

  const colorByCountry = useMemo(() => {
    const map = new Map<string, string>()
    orderedCountries.forEach((c, i) => {
      map.set(c, CHART_COLORS[i % CHART_COLORS.length])
    })
    return map
  }, [orderedCountries])

  const headerActions = (
    <ToggleGroup
      label={t('dashboard.charts.view')}
      value={viewMode}
      onChange={(v) => setViewMode(v as ViewMode)}
      options={[
        { value: 'bar', label: t('dashboard.charts.bar') },
        { value: 'pie', label: t('dashboard.charts.pie') },
      ]}
    />
  )

  return (
    <ChartCard title={t('dashboard.charts.monthlyTrend')} headerActions={headerActions}>
      {viewMode === 'bar' ? (
        <BarView
          months={months}
          orderedCountries={orderedCountries}
          data={data}
          colorByCountry={colorByCountry}
          tCountry={tCountry}
        />
      ) : (
        <PieGridView
          months={months}
          orderedCountries={orderedCountries}
          data={data}
          colorByCountry={colorByCountry}
          tCountry={tCountry}
        />
      )}
    </ChartCard>
  )
}

function ToggleGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-[var(--text-secondary)]">{label}:</span>
      <div className="inline-flex overflow-hidden rounded-[var(--gme-radius-sm)] border border-[var(--border)]">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={
                'px-2 py-1 transition-colors ' +
                (active
                  ? 'bg-[var(--surface)] font-medium'
                  : 'hover:bg-[var(--surface)] text-[var(--text-secondary)]')
              }
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BarView({
  months,
  orderedCountries,
  data,
  colorByCountry,
  tCountry,
}: {
  months: string[]
  orderedCountries: string[]
  data: Record<string, Record<string, number>>
  colorByCountry: Map<string, string>
  tCountry: (n: string) => string
}) {
  const chartData = months.map((month) => ({
    month,
    ...Object.fromEntries(orderedCountries.map((c) => [c, data[month]?.[c] ?? 0])),
  }))

  function CustomTooltip({ active, label, payload }: TooltipProps) {
    if (!active || !payload || !label) return null
    const byKey = new Map<string, TooltipPayloadItem>()
    for (const p of payload) byKey.set(p.dataKey, p)
    const ordered = orderedCountries.filter((c) => byKey.has(c))
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
        {ordered.map((c) => {
          const p = byKey.get(c)!
          return (
            <div key={c} style={{ color: p.color }}>
              {tCountry(c)} : {p.value}
            </div>
          )
        })}
      </div>
    )
  }

  // Stacked bars are drawn bottom→top in <Bar> order, so reverse for descending-on-top.
  const renderOrder = [...orderedCountries].reverse()

  return (
    <div>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          {renderOrder.map((country) => (
            <Bar
              key={country}
              dataKey={country}
              stackId="a"
              fill={colorByCountry.get(country)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {orderedCountries.map((c) => (
          <div key={c} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: colorByCountry.get(c) }}
            />
            <span>{tCountry(c)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PieGridView({
  months,
  orderedCountries,
  data,
  colorByCountry,
  tCountry,
}: {
  months: string[]
  orderedCountries: string[]
  data: Record<string, Record<string, number>>
  colorByCountry: Map<string, string>
  tCountry: (n: string) => string
}) {
  function PieTooltip({ active, payload }: {
    active?: boolean
    payload?: { name: string; value: number; payload: { fill: string } }[]
  }) {
    if (!active || !payload || payload.length === 0) return null
    const p = payload[0]
    return (
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--gme-radius-sm)',
          padding: '6px 10px',
          fontSize: 12,
          color: p.payload.fill,
        }}
      >
        {tCountry(p.name)} : {p.value}
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {months.map((month) => {
          const slices = orderedCountries
            .map((c) => ({ name: c, value: data[month]?.[c] ?? 0 }))
            .filter((s) => s.value > 0)
          const total = slices.reduce((acc, s) => acc + s.value, 0)
          return (
            <div key={month} className="flex flex-col items-center">
              <div className="mb-1 text-sm font-medium">{month}</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="35%"
                    outerRadius="65%"
                    isAnimationActive={false}
                    stroke="var(--border)"
                    label={(raw) => {
                      const props = raw as {
                        cx: number
                        cy: number
                        midAngle: number
                        outerRadius: number
                        percent?: number
                        name?: string
                      }
                      const RADIAN = Math.PI / 180
                      const r = props.outerRadius + 10
                      const x = props.cx + r * Math.cos(-props.midAngle * RADIAN)
                      const y = props.cy + r * Math.sin(-props.midAngle * RADIAN)
                      const color = colorByCountry.get(props.name ?? '') ?? CHART_COLORS[0]
                      return (
                        <text
                          x={x}
                          y={y}
                          fill={color}
                          fontSize={9}
                          textAnchor={x > props.cx ? 'start' : 'end'}
                          dominantBaseline="central"
                        >
                          <tspan>{tCountry(props.name ?? '')} </tspan>
                          <tspan fontWeight="700">
                            {((props.percent ?? 0) * 100).toFixed(0)}%
                          </tspan>
                        </text>
                      )
                    }}
                    labelLine={false}
                  >
                    {slices.map((s) => (
                      <Cell key={s.name} fill={colorByCountry.get(s.name) ?? CHART_COLORS[0]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-xs text-[var(--text-secondary)]">{total}</div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {orderedCountries.map((c) => (
          <div key={c} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: colorByCountry.get(c) }}
            />
            <span>{tCountry(c)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
