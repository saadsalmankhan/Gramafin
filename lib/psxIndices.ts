// PSX's own market-data endpoints treat indices as symbols just like
// equities (confirmed empirically: /timeseries/int|eod/KSE100 works the
// same as it does for a stock ticker), but indices aren't listed in the
// /symbols equities feed — so the small set worth surfacing is hardcoded
// here rather than discovered at runtime.
export interface PsxIndex {
  code: string
  label: string
}

export const PSX_INDICES: PsxIndex[] = [
  { code: 'KSE100', label: 'KSE-100 Index' },
  { code: 'KSE30', label: 'KSE-30 Index' },
  { code: 'ALLSHR', label: 'All Share Index' },
  { code: 'KMI30', label: 'KMI-30 Index' },
  { code: 'KMIALLSHR', label: 'KMI All Share Index' },
  { code: 'PSXDIV20', label: 'PSX Dividend 20 Index' },
]

export type ChartRange = '1d' | '1m' | '6m' | '1y' | '5y'

export const CHART_RANGES: { key: ChartRange; label: string }[] = [
  { key: '1d', label: '1D' },
  { key: '1m', label: '1M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '5y', label: '5Y' },
]
