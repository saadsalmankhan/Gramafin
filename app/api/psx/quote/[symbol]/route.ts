import { NextResponse } from 'next/server'
import { apiRatelimit, clientIp } from '@/lib/ratelimit'

interface PsxTimeseriesResponse {
  status: number
  data: number[][]
}

const SYMBOL_RE = /^[A-Z0-9]{1,12}$/

async function fetchLatestTick(url: string): Promise<number | null> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
  if (!res.ok) return null
  const body = (await res.json()) as PsxTimeseriesResponse
  const latest = body.data?.[0]
  return latest && typeof latest[1] === 'number' ? latest[1] : null
}

// Live intraday ticks when the market's trading; end-of-day close as a
// fallback for after-hours/weekends, or if a symbol has no ticks today.
export async function GET(req: Request, { params }: { params: { symbol: string } }) {
  const { success } = await apiRatelimit.limit(`psx-quote:${clientIp(req)}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const symbol = params.symbol.toUpperCase()
  if (!SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }

  try {
    const intraday = await fetchLatestTick(`https://dps.psx.com.pk/timeseries/int/${symbol}`)
    if (intraday !== null) {
      return NextResponse.json({ price: intraday, source: 'live', fetchedAt: new Date().toISOString() })
    }

    const eod = await fetchLatestTick(`https://dps.psx.com.pk/timeseries/eod/${symbol}`)
    if (eod !== null) {
      return NextResponse.json({ price: eod, source: 'eod', fetchedAt: new Date().toISOString() })
    }

    return NextResponse.json({ error: 'No price data for symbol' }, { status: 404 })
  } catch (err) {
    console.error('Failed to fetch PSX quote:', err)
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 502 })
  }
}
