import clsx from 'clsx'

interface Props {
  label: string
  value: string
  sub?: string
  variant?: 'default' | 'positive' | 'negative'
}

export default function MetricCard({ label, value, sub, variant = 'default' }: Props) {
  return (
    <div className="metric-card">
      <p className="section-label mb-2">{label}</p>
      <p
        className={clsx(
          'text-2xl font-semibold leading-none tracking-tight font-mono',
          variant === 'positive' && 'text-success',
          variant === 'negative' && 'text-danger',
          variant === 'default' && 'text-ink-primary'
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-ink-muted mt-1.5">{sub}</p>}
    </div>
  )
}
