'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { useMemo } from 'react'
import type { VestValueBar } from '@/lib/chart-data'
import { currencyPrefix } from '@/lib/money'

interface VestValueChartProps {
  data: VestValueBar[]
  currency: 'USD' | 'AUD'
}

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#8b5cf6', '#dc2626', '#0891b2']

export function VestValueChart({ data, currency }: VestValueChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground" data-testid="vest-value-empty">
        No vest data available.
      </p>
    )
  }

  const { grants, chartData } = useMemo(() => {
    const g = [...new Set(data.map((d) => d.grant))]
    const grouped = data.reduce<Record<string, Record<string, number>>>((acc, d) => {
      if (!acc[d.date]) acc[d.date] = {}
      acc[d.date][d.grant] = d.value
      return acc
    }, {})
    const cd = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }))
    return { grants: g, chartData: cd }
  }, [data])

  const prefix = currencyPrefix(currency)

  return (
    <div data-testid="vest-value-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => `${prefix}${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => `${prefix}${v.toLocaleString()}`} />
          <Legend />
          {grants.map((grant, i) => (
            <Bar key={grant} dataKey={grant} fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
