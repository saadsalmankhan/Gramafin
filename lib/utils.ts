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

export function gainPct(cost: number, current: number, decimals = 1): string {
  if (cost === 0) return (0).toFixed(decimals)
  return (((current - cost) / cost) * 100).toFixed(decimals)
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
}

// Pakistan's tax year runs July 1 - June 30, spanning two calendar years.
export function fiscalYearRange(dateStr: string = today()): { start: string; end: string; label: string } {
  const [year, month] = dateStr.split('-').map(Number)
  const startYear = month >= 7 ? year : year - 1
  return {
    start: `${startYear}-07-01`,
    end: `${startYear + 1}-06-30`,
    label: `FY${startYear}-${String(startYear + 1).slice(2)}`,
  }
}

export function inFiscalYear(dateStr: string, range = fiscalYearRange()): boolean {
  return dateStr >= range.start && dateStr <= range.end
}
