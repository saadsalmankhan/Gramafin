'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { fetchTimeseries, TimeseriesPoint } from '@/lib/fetchStockPrice'
import { ChartRange, CHART_RANGES } from '@/lib/psxIndices'
import { useChartColors } from '@/lib/theme'
import { RefreshCw } from 'lucide-react'
import clsx from 'clsx'

// Live intraday ticks only make sense to keep polling while the market's
// actually moving — a 1M/5Y chart of daily closes doesn't change minute to
// minute, so auto-refresh is scoped to the 1D range.
const LIVE_POLL_MS = 60_000

function formatValue(v: number, unit: 'index' | 'PKR'): string {
  const n = v.toLocaleString('en-PK', { maximumFractionDigits: 2 })
  return unit === 'PKR' ? `Rs ${n}` : n
}

function formatTick(t: number, range: ChartRange): string {
  const d = new Date(t)
  if (range === '1d') return d.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: range === '1m' ? undefined : '2-digit' })
}

interface Props {
  symbol: string
  label: string
  unit?: 'index' | 'PKR'
  defaultRange?: ChartRange
  height?: number
}

export default function MarketChart({ symbol, label, unit = 'index', defaultRange = '1d', height = 220 }: Props) {
  const chartColors = useChartColors()
  const [range, setRange] = useState<ChartRange>(defaultRange)
  const [points, setPoints] = useState<TimeseriesPoint[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [source, setSource] = useState<'intraday' | 'eod' | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus(prev => (prev === 'ready' ? 'ready' : 'loading')) // keep old chart visible during a background refresh
      const result = await fetchTimeseries(symbol, range)
      if (cancelled) return
      if (result.source === 'failed' || result.points.length === 0) {
        setStatus('failed')
        return
      }
      setPoints(result.points)
      setSource(result.source)
      setLastFetched(new Date())
      setStatus('ready')
    }

    load()

    if (pollRef.current) clearInterval(pollRef.current)
    if (range === '1d') {
      pollRef.current = setInterval(load, LIVE_POLL_MS)
    }

    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [symbol, range])

  const first = points[0]?.v
  const last = points[points.length - 1]?.v
  const change = first !== undefined && last !== undefined ? last - first : 0
  const changePct = first ? (change / first) * 100 : 0
  const isUp = change >= 0
  const trendColor = isUp ? 'rgb(var(--success))' : 'rgb(var(--danger))'

  return (
    <div>
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-ink-primary">{label}</h3>
            {source === 'intraday' && (
              <span className="flex items-center gap-1 text-[10px] text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
              </span>
            )}
            {source === 'eod' && range === '1d' && (
              <span className="flex items-center gap-1 text-[10px] text-ink-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-muted" /> Market closed
              </span>
            )}
          </div>
          {status === 'ready' && last !== undefined && (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-mono font-semibold text-ink-primary">{formatValue(last, unit)}</span>
              <span className={clsx('text-xs font-medium font-mono', isUp ? 'text-success' : 'text-danger')}>
                {isUp ? '+' : ''}{change.toLocaleString('en-PK', { maximumFractionDigits: 2 })} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        <div className="flex rounded-lg border border-gray-200 dark:border-white/10 p-0.5">
          {CHART_RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={clsx(
                'px-2.5 py-1 text-[11px] rounded-md transition-colors',
                range === r.key ? 'bg-brand-600 text-white' : 'text-ink-secondary hover:bg-surface-0'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {status === 'failed' && (
        <div style={{ height }} className="flex items-center justify-center text-sm text-ink-muted text-center px-6">
          Couldn't load {label} right now — try again shortly
        </div>
      )}

      {status === 'loading' && points.length === 0 && (
        <div style={{ height }} className="flex items-center justify-center text-sm text-ink-muted gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      {points.length > 0 && (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`marketFill-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={trendColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="t"
              tickFormatter={t => formatTick(t, range)}
              tick={{ fontSize: 11, fill: chartColors.axisText }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 11, fill: chartColors.axisText }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
              width={56}
            />
            <Tooltip
              labelFormatter={t => new Date(t as number).toLocaleString('en-PK')}
              formatter={(val: number) => [formatValue(val, unit), label]}
              cursor={{ stroke: chartColors.gridStroke }}
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
            <Area
              type="monotone"
              dataKey="v"
              stroke={trendColor}
              strokeWidth={2}
              fill={`url(#marketFill-${symbol})`}
              isAnimationActive={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {lastFetched && status === 'ready' && (
        <p className="text-[10px] text-ink-muted mt-2">
          Updated {lastFetched.toLocaleTimeString('en-PK')}
          {source === 'eod' && ' · previous close'}
        </p>
      )}
    </div>
  )
}
