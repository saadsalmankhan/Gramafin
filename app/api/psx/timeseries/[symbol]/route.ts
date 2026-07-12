import { NextResponse } from 'next/server'
import { apiRatelimit, clientIp } from '@/lib/ratelimit'

interface PsxTimeseriesResponse {
  status: number
  data: number[][]
}

const SYMBOL_RE = /^[A-Z0-9]{1,12}$/
const RANGE_DAYS: Record<string, number | null> = {
  '1m': 30,
  '6m': 182,
  '1y': 365,
  '5y': 365 * 5,
}

// Same underlying PSX timeseries API used for individual stock quotes
// (see /api/psx/quote) — indices like KSE100/KSE30 are just symbols to it,
// confirmed empirically. This route returns the full point series for
// charting instead of just the latest tick.
export async function GET(req: Request, { params }: { params: { symbol: string } }) {
  const { success } = await apiRatelimit.limit(`psx-timeseries:${clientIp(req)}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const symbol = params.symbol.toUpperCase()
  if (!SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') ?? '1d'

  try {
    if (range === '1d') {
      const res = await fetch(`https://dps.psx.com.pk/timeseries/int/${symbol}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`PSX intraday fetch failed (${res.status})`)
      const body = (await res.json()) as PsxTimeseriesResponse
      // PSX returns most-recent-first; charts read left-to-right chronologically.
      const points = (body.data ?? [])
        .map(([t, v]) => ({ t: t * 1000, v }))
        .reverse()
      return NextResponse.json({ points, source: 'intraday' as const })
    }

    const res = await fetch(`https://dps.psx.com.pk/timeseries/eod/${symbol}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }, // EOD closes only change once/day
    })
    if (!res.ok) throw new Error(`PSX eod fetch failed (${res.status})`)
    const body = (await res.json()) as PsxTimeseriesResponse

    const days = RANGE_DAYS[range] ?? null
    const cutoff = days ? Date.now() / 1000 - days * 86400 : 0
    const points = (body.data ?? [])
      .filter(([t]) => t >= cutoff)
      .map(([t, v]) => ({ t: t * 1000, v }))
      .reverse()

    return NextResponse.json({ points, source: 'eod' as const })
  } catch (err) {
    console.error('Failed to fetch PSX timeseries:', err)
    return NextResponse.json({ error: 'Failed to fetch timeseries' }, { status: 502 })
  }
}
