'use client'

import { useEffect, useState } from 'react'
import { fetchTimeseries } from '@/lib/fetchStockPrice'
import clsx from 'clsx'

const POLL_MS = 60_000

interface Props {
  code: string
  label: string
  onClick?: () => void
  active?: boolean
}

export default function IndexTicker({ code, label, onClick, active }: Props) {
  const [value, setValue] = useState<number | null>(null)
  const [changePct, setChangePct] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const result = await fetchTimeseries(code, '1d')
      if (cancelled) return
      if (result.points.length === 0) {
        setFailed(true)
        return
      }
      const first = result.points[0].v
      const last = result.points[result.points.length - 1].v
      setValue(last)
      setChangePct(first ? ((last - first) / first) * 100 : 0)
      setFailed(false)
    }

    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [code])

  const isUp = (changePct ?? 0) >= 0

  return (
    <button
      onClick={onClick}
      className={clsx(
        'text-left px-3.5 py-2.5 rounded-lg border transition-colors',
        active
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
          : 'border-gray-100 dark:border-white/10 bg-white dark:bg-surface-2 hover:border-gray-200 dark:hover:border-white/20'
      )}
    >
      <p className="text-[11px] text-ink-muted truncate">{label}</p>
      {failed ? (
        <p className="text-xs text-ink-muted mt-0.5">Unavailable</p>
      ) : value === null ? (
        <p className="text-sm font-mono text-ink-muted mt-0.5">…</p>
      ) : (
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-sm font-mono font-semibold text-ink-primary">
            {value.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
          </span>
          <span className={clsx('text-[11px] font-mono font-medium', isUp ? 'text-success' : 'text-danger')}>
            {isUp ? '+' : ''}{changePct!.toFixed(2)}%
          </span>
        </div>
      )}
    </button>
  )
}
