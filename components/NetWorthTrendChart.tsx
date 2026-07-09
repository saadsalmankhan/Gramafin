'use client'

import { NetWorthSnapshot } from '@/types'
import { fmt, fmtCompact } from '@/lib/utils'
import { useChartColors } from '@/lib/theme'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const LINE_COLOR = '#008037' // brand-600

export default function NetWorthTrendChart({ history }: { history: NetWorthSnapshot[] }) {
  const chartColors = useChartColors()

  if (history.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-ink-muted text-center px-6">
        Check back after a few days of activity to see your net worth trend
      </div>
    )
  }

  const data = history.map(h => ({ date: h.date.slice(5), value: h.value }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.1} />
            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: chartColors.axisText }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: chartColors.axisText }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => fmtCompact(v)}
          width={64}
        />
        <Tooltip
          formatter={(val: number) => [fmt(val), 'Net worth']}
          contentStyle={{
            fontSize: 12,
            border: `1px solid ${chartColors.tooltipBorder}`,
            borderRadius: 8,
            background: chartColors.tooltipBg,
            color: chartColors.mutedText,
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={LINE_COLOR}
          strokeWidth={2}
          fill="url(#netWorthFill)"
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
