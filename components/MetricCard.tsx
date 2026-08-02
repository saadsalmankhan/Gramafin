import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

/** Per-metric identity chip, not a mood ring — pick the tone that names what
    the metric IS (a balance, a flow, a holding), not whether it's good news. */
export type MetricTone = 'brand' | 'violet' | 'amber' | 'sky' | 'danger'

const TONE_CHIP: Record<MetricTone, string> = {
  brand:  'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-500',
  violet: 'bg-accent-violet/10 text-accent-violet',
  amber:  'bg-accent-amber/10 text-accent-amber',
  sky:    'bg-accent-sky/10 text-accent-sky',
  danger: 'bg-danger/10 text-danger',
}

interface Props {
  label: string
  value: string
  sub?: string
  /** Small chip on the label row, e.g. "+2.4%" — this is where color lives now, never the number. */
  delta?: string
  deltaTone?: 'positive' | 'negative' | 'neutral'
  /** @deprecated Number no longer takes color; pass `delta`/`deltaTone` instead. Kept so existing call sites compile. */
  variant?: 'default' | 'positive' | 'negative'
  /** Optional accent chip — omit for a plain text-only card. */
  icon?: LucideIcon
  tone?: MetricTone
}

export default function MetricCard({ label, value, sub, delta, deltaTone = 'positive', icon: Icon, tone = 'brand' }: Props) {
  const m = /^Rs\s+(.+)$/.exec(value)
  const deltaBadge = delta && (
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
  )
  return (
    <div className="metric-card min-w-0">
      {Icon && (
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className={clsx('icon-chip', TONE_CHIP[tone])}>
            <Icon className="w-4 h-4" />
          </span>
          {deltaBadge}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="section-label truncate">{label}</p>
        {!Icon && deltaBadge}
      </div>
      <p className="flex items-baseline gap-1 whitespace-nowrap font-mono font-semibold tracking-tight text-ink-primary">
        {m && <span className="text-[13px] font-medium text-ink-muted">Rs</span>}
        <span className="text-2xl leading-none">{m ? m[1] : value}</span>
      </p>
      {sub && <p className="text-[11px] text-ink-muted mt-1.5 truncate">{sub}</p>}
    </div>
  )
}
