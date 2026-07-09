import { PsxSymbol } from '@/types'

export interface StockPriceResult {
  price: number
  source: 'live' | 'eod' | 'failed'
  fetchedAt: string
}

// Session cache so re-fetching the same symbol repeatedly (e.g. re-rendering
// several holdings of the same stock) doesn't hammer the API needlessly.
const priceCache = new Map<string, StockPriceResult>()
let symbolsCache: PsxSymbol[] | null = null

export async function fetchStockPrice(symbol: string): Promise<StockPriceResult> {
  const key = symbol.toUpperCase()
  try {
    const res = await fetch(`/api/psx/quote/${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = (await res.json()) as { price: number; source: 'live' | 'eod'; fetchedAt: string }
      const result: StockPriceResult = { price: data.price, source: data.source, fetchedAt: data.fetchedAt }
      priceCache.set(key, result)
      return result
    }
  } catch {
    // network error or timeout — fall through to failed
  }
  return { price: 0, source: 'failed', fetchedAt: new Date().toISOString() }
}

export async function fetchPsxSymbols(): Promise<PsxSymbol[]> {
  if (symbolsCache) return symbolsCache
  try {
    const res = await fetch('/api/psx/symbols', { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Failed to fetch symbols (${res.status})`)
    const data = (await res.json()) as { symbols: PsxSymbol[] }
    symbolsCache = data.symbols
    return symbolsCache
  } catch {
    return []
  }
}
