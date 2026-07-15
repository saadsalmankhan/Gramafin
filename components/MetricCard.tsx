import clsx from 'clsx'

interface Props {
  label: string
  value: string
  sub?: string
  /** Small chip on the label row, e.g. "+2.4%" — this is where color lives now, never the number. */
  delta?: string
  deltaTone?: 'positive' | 'negative' | 'neutral'
  /** @deprecated Number no longer takes color; pass `delta`/`deltaTone` instead. Kept so existing call sites compile. */
  variant?: 'default' | 'positive' | 'negative'
}

export default function MetricCard({ label, value, sub, delta, deltaTone = 'positive' }: Props) {
  const m = /^Rs\s+(.+)$/.exec(value)
  return (
    <div className="metric-card min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="section-label truncate">{label}</p>
        {delta && (
          <span
            className={clsx(
              'shrink-0 text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-full whitespace-nowrap',
              deltaTone === 'positive' && 'text-success bg-success/10',
              deltaTone === 'negative' && 'text-danger bg-danger/10',
              deltaTone === 'neutral' && 'text-ink-secondary bg-ink-primary/5'
            )}
          >
            {delta}
          </span>
        )}
      </div>
      <p className="flex items-baseline gap-1 whitespace-nowrap font-mono font-semibold tracking-tight text-ink-primary">
        {m && <span className="text-[13px] font-medium text-ink-muted">Rs</span>}
        <span className="text-2xl leading-none">{m ? m[1] : value}</span>
      </p>
      {sub && <p className="text-[11px] text-ink-muted mt-1.5 truncate">{sub}</p>}
    </div>
  )
}
