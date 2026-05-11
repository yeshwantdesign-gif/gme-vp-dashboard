'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { ChartCard } from '@/components/shared/chart-card'
import { useLocale } from '@/contexts/locale-context'
import type { CisRow } from '@/lib/types'

function CisTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey?: string; payload: CisRow }[]
  label?: string
}) {
  const { t, tCountry } = useLocale()
  const fmt = new Intl.NumberFormat('en-US')

  if (!active || !payload || payload.length === 0) return null

  const entry = payload[0]
  const row = entry.payload
  const isCis = entry.dataKey === 'cis'

  const regionLabel = isCis ? t('dashboard.charts.cis') : t('dashboard.charts.nonCis')
  const regionTotal = isCis ? row.cis : row.nonCis
  const regionColor = isCis ? '#7c3aed' : '#0ea5e9'
  const breakdown = isCis ? row.cisBreakdown : row.nonCisBreakdown

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--gme-radius-sm)',
        padding: '0.75rem',
      }}
      className="text-sm"
    >
      <div className="mb-2 font-medium">{label}</div>

      <div className="font-medium" style={{ color: regionColor }}>
        {regionLabel}: <span className="tabular-nums">{fmt.format(regionTotal)}</span>
      </div>
      {breakdown.map((item) => (
        <div key={item.country} className="flex justify-between gap-4 pl-3 text-[var(--text-secondary)]">
          <span>{tCountry(item.country)}</span>
          <span className="tabular-nums">{fmt.format(item.count)}</span>
        </div>
      ))}
    </div>
  )
}

export function CisAnalysis({ data }: { data: CisRow[] }) {
  const { t } = useLocale()

  return (
    <ChartCard title={t('dashboard.charts.cisAnalysis')}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip shared={false} content={<CisTooltip />} />
          <Legend />
          <Bar dataKey="cis" name={t('dashboard.charts.cis')} fill="#7c3aed" />
          <Bar dataKey="nonCis" name={t('dashboard.charts.nonCis')} fill="#0ea5e9" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
