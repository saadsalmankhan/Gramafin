'use client'

import { NetWorthBreakdown } from '@/lib/networth'
import { fmt, fmtCompact } from '@/lib/utils'
import { useChartColors, ChartColors } from '@/lib/theme'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
} from 'recharts'

// Order and hues validated with the dataviz palette script (CVD-safe
// adjacent pairs); don't reorder without re-running validate_palette.js.
const COLORS = {
  'Cash & assets': '#2a78d6',
  'Investments': '#1baf7a',
  'Bank accounts': '#6f42c1',
  'Mutual funds': '#eda100',
  'Net savings': '#008037',
  'Liabilities': '#e34948',
}

interface ValueLabelProps {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
  chartColors?: ChartColors
}

// A bar's tip sits at a distance from the Y-axis that depends on the data
// range, so anchoring the fallback label there risks colliding with the axis
// text for a large-magnitude or negative bar. The zero-side edge doesn't have
// that problem — it's always in the chart's open middle — so that's the one
// safe place for a label that doesn't fit inside the fill.
function ValueLabel({ x = 0, y = 0, width = 0, height = 0, value = 0, chartColors }: ValueLabelProps) {
  const isNegative = value < 0
  const label = fmtCompact(Math.abs(value))
  // Rough px-per-character at 11px system-ui, plus 8px padding on each side.
  const fitsInside = width > label.length * 7 + 16

  if (fitsInside) {
    return (
      <text
        x={isNegative ? x + 8 : x + width - 8}
        y={y + height / 2}
        dy={4}
        textAnchor={isNegative ? 'start' : 'end'}
        fontSize={11}
        fontWeight={500}
        fill="#fff"
      >
        {label}
      </text>
    )
  }
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      dy={4}
      textAnchor="start"
      fontSize={11}
      fill={chartColors?.mutedText ?? '#52514e'}
    >
      {label}
    </text>
  )
}

export default function NetWorthBreakdownChart({ breakdown }: { breakdown: NetWorthBreakdown }) {
  const chartColors = useChartColors()
  const data = [
    { name: 'Cash & assets', value: breakdown.cashAndAssets },
    { name: 'Investments', value: breakdown.investments },
    { name: 'Bank accounts', value: breakdown.bankAccounts },
    { name: 'Mutual funds', value: breakdown.mutualFunds },
    { name: 'Net savings', value: breakdown.netSavings },
    { name: 'Liabilities', value: -breakdown.liabilities },
  ]

  const allZero = data.every(d => d.value === 0)
  if (allZero) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-ink-muted text-center px-6">
        Add assets, bank accounts, investments, or income to see your net worth breakdown
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 48, left: 44, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 11, fill: chartColors.mutedText }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine x={0} stroke={chartColors.gridStroke} />
        <Tooltip
          formatter={(val: number) => [fmt(Math.abs(val)), '']}
          labelFormatter={(label: string) => label}
          contentStyle={{
            fontSize: 12,
            border: `1px solid ${chartColors.tooltipBorder}`,
            borderRadius: 8,
            background: chartColors.tooltipBg,
            color: chartColors.mutedText,
          }}
        />
        <Bar dataKey="value" radius={4} barSize={20}>
          {data.map(d => (
            <Cell key={d.name} fill={COLORS[d.name as keyof typeof COLORS]} />
          ))}
          <LabelList dataKey="value" content={<ValueLabel chartColors={chartColors} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
