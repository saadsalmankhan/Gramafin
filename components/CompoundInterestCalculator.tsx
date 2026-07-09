'use client'

import { useState, useMemo } from 'react'
import { fmt, fmtCompact } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const LINE_COLOR = '#008037' // brand-600, matches NetWorthTrendChart

const COMPOUNDING_OPTIONS = [
  { label: 'Annually', periodsPerYear: 1 },
  { label: 'Semi-annually', periodsPerYear: 2 },
  { label: 'Quarterly', periodsPerYear: 4 },
  { label: 'Monthly', periodsPerYear: 12 },
  { label: 'Daily', periodsPerYear: 365 },
]

interface YearPoint {
  year: number
  balance: number
  contributed: number
}

function simulate(principal: number, monthlyContribution: number, annualRatePct: number, years: number, periodsPerYear: number) {
  const annualRate = annualRatePct / 100
  // Convert the nominal annual rate (compounded periodsPerYear times) into an
  // equivalent effective monthly rate, so any compounding frequency combines
  // cleanly with monthly contributions in one month-by-month simulation.
  const monthlyRate = Math.pow(1 + annualRate / periodsPerYear, periodsPerYear / 12) - 1

  const months = Math.round(years * 12)
  let balance = principal
  let contributed = principal
  const points: YearPoint[] = [{ year: 0, balance, contributed }]

  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution
    contributed += monthlyContribution
    if (m % 12 === 0) {
      points.push({ year: m / 12, balance, contributed })
    }
  }
  // Capture a final partial-year point if the term isn't a whole number of years.
  if (months % 12 !== 0) {
    points.push({ year: years, balance, contributed })
  }

  return { finalBalance: balance, totalContributed: contributed, points }
}

export default function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState('100000')
  const [monthlyContribution, setMonthlyContribution] = useState('10000')
  const [rate, setRate] = useState('12')
  const [years, setYears] = useState('10')
  const [periodsPerYear, setPeriodsPerYear] = useState(12)

  const result = useMemo(() => {
    const p = parseFloat(principal) || 0
    const c = parseFloat(monthlyContribution) || 0
    const r = parseFloat(rate) || 0
    const y = parseFloat(years) || 0
    if (p < 0 || c < 0 || r < 0 || y <= 0) return null
    return simulate(p, c, r, y, periodsPerYear)
  }, [principal, monthlyContribution, rate, years, periodsPerYear])

  const totalInterest = result ? result.finalBalance - result.totalContributed : 0
  const chartData = result?.points.map(pt => ({ year: `Yr ${pt.year}`, balance: Math.round(pt.balance), contributed: Math.round(pt.contributed) })) ?? []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-sm font-medium text-ink-primary mb-4">Your numbers</h2>
        <div className="space-y-3">
          <div>
            <label className="section-label mb-1 block">Starting amount (PKR)</label>
            <input
              className="input font-mono"
              type="number"
              min="0"
              value={principal}
              onChange={e => setPrincipal(e.target.value)}
            />
          </div>
          <div>
            <label className="section-label mb-1 block">Monthly contribution (PKR)</label>
            <input
              className="input font-mono"
              type="number"
              min="0"
              value={monthlyContribution}
              onChange={e => setMonthlyContribution(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label mb-1 block">Annual return (%)</label>
              <input
                className="input font-mono"
                type="number"
                min="0"
                step="0.1"
                value={rate}
                onChange={e => setRate(e.target.value)}
              />
            </div>
            <div>
              <label className="section-label mb-1 block">Time period (years)</label>
              <input
                className="input font-mono"
                type="number"
                min="1"
                value={years}
                onChange={e => setYears(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="section-label mb-1 block">Compounding frequency</label>
            <select
              className="select w-full"
              value={periodsPerYear}
              onChange={e => setPeriodsPerYear(Number(e.target.value))}
            >
              {COMPOUNDING_OPTIONS.map(o => (
                <option key={o.label} value={o.periodsPerYear}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-medium text-ink-primary mb-4">Where you end up</h2>
        {!result ? (
          <div className="h-48 flex items-center justify-center text-sm text-ink-muted text-center px-6">
            Enter a starting amount, return, and a time period greater than 0
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="metric-card">
                <p className="text-[10px] text-ink-muted mb-1">Final balance</p>
                <p className="text-lg font-mono font-semibold text-ink-primary">{fmtCompact(result.finalBalance)}</p>
              </div>
              <div className="metric-card">
                <p className="text-[10px] text-ink-muted mb-1">Interest earned</p>
                <p className="text-lg font-mono font-semibold text-success">+{fmtCompact(totalInterest)}</p>
              </div>
            </div>
            <p className="text-xs text-ink-muted mb-4">
              Total contributed: <span className="font-mono text-ink-secondary">{fmt(result.totalContributed)}</span>
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ciFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.1} />
                    <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: '#8a8880' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8a8880' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => fmtCompact(v)}
                  width={56}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [fmt(val), name === 'balance' ? 'Balance' : 'Contributed']}
                  contentStyle={{
                    fontSize: 12,
                    border: '1px solid #e5e5e5',
                    borderRadius: 8,
                    background: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                  fill="url(#ciFill)"
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  )
}
