'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { fmt, fmtCompact } from '@/lib/utils'
import { useChartColors } from '@/lib/theme'
import { CATEGORY_COLORS, ExpenseCategory } from '@/types'

interface CatTotal {
  name: string
  fullName: string
  total: number
}

interface Props {
  data: CatTotal[]
  totalSpend: number
  centerLabel: string
}

// Donut + a plain list legend (not Recharts' built-in Legend) so amounts can
// sit right-aligned next to each category name, matching how every other
// amount in the app reads — Recharts' legend can't do that layout on its own.
export default function SpendingDonutChart({ data, totalSpend, centerLabel }: Props) {
  const chartColors = useChartColors()

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-ink-muted">
        No expenses logged this month
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: 180, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="fullName"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {data.map(d => (
                <Cell key={d.fullName} fill={CATEGORY_COLORS[d.fullName as ExpenseCategory] ?? '#888'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: number, _name: string, props: { payload?: { fullName?: string } }) => [
                fmt(val),
                props.payload?.fullName ?? '',
              ]}
              contentStyle={{
                fontSize: 12,
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: 8,
                background: chartColors.tooltipBg,
                color: chartColors.mutedText,
              }}
              labelStyle={{ color: chartColors.mutedText }}
              itemStyle={{ color: chartColors.mutedText }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
          <p className="text-lg font-mono font-semibold text-ink-primary leading-tight">{fmtCompact(totalSpend)}</p>
          <p className="text-[9px] text-ink-muted tracking-wide text-center">{centerLabel}</p>
        </div>
      </div>
      <div className="flex-1 w-full space-y-2 min-w-0">
        {data.map(d => (
          <div key={d.fullName} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: CATEGORY_COLORS[d.fullName as ExpenseCategory] ?? '#888' }}
              />
              <span className="text-ink-secondary truncate">{d.fullName}</span>
            </div>
            <span className="font-mono text-ink-primary flex-shrink-0 tabular-nums">{fmt(d.total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
