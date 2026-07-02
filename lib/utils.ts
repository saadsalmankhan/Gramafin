export function fmt(n: number): string {
  return 'Rs ' + Math.round(n).toLocaleString('en-PK')
}

export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return 'Rs ' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return 'Rs ' + (n / 1_000).toFixed(0) + 'K'
  return fmt(n)
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100)
}

export function gainPct(cost: number, current: number): string {
  if (cost === 0) return '0.0'
  return (((current - cost) / cost) * 100).toFixed(1)
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
}
