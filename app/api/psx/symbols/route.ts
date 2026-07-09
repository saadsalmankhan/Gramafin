import { NextResponse } from 'next/server'
import { apiRatelimit, clientIp } from '@/lib/ratelimit'
import { PsxSymbol } from '@/types'

interface PsxSymbolRaw {
  symbol: string
  name: string
  sectorName: string
  isETF: boolean
  isDebt: boolean
}

// PSX's own Data Portal exposes this unauthenticated, CORS-open JSON endpoint
// for its own frontend. Proxied server-side (rather than called directly from
// the browser) so it isn't subject to our CSP's connect-src, and so the
// ~140KB symbol list can be cached instead of re-fetched by every client.
const PSX_SYMBOLS_URL = 'https://dps.psx.com.pk/symbols'

export async function GET(req: Request) {
  const { success } = await apiRatelimit.limit(`psx-symbols:${clientIp(req)}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const res = await fetch(PSX_SYMBOLS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }, // symbol list rarely changes
    })
    if (!res.ok) throw new Error(`PSX symbols fetch failed (${res.status})`)
    const raw = (await res.json()) as PsxSymbolRaw[]

    // Bonds/TFCs aren't "stocks" — exclude debt instruments, keep equities/ETFs.
    const symbols: PsxSymbol[] = raw
      .filter(s => !s.isDebt)
      .map(s => ({ symbol: s.symbol, name: s.name, sectorName: s.sectorName }))

    return NextResponse.json({ symbols })
  } catch (err) {
    console.error('Failed to fetch PSX symbols:', err)
    return NextResponse.json({ error: 'Failed to fetch PSX symbols' }, { status: 502 })
  }
}
