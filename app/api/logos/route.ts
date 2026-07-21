import { NextResponse } from 'next/server'
import { stockLogo, fundLogo, bankLogo } from '@/lib/entityLogo'

// {initials, color} are a pure function of (type, value) — the same input
// always produces the same output, forever — so responses are cached
// aggressively (both by the browser and Vercel's edge CDN, keyed on the
// full URL including query string) instead of recomputing on every call. A
// stock search dropdown re-requesting the same symbol repeatedly should hit
// cache, not this handler.
const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=31536000, immutable' }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const value = searchParams.get('value')

  if (!value) {
    return NextResponse.json({ error: 'Missing value' }, { status: 400 })
  }

  switch (type) {
    case 'stock':
      return NextResponse.json(stockLogo(value), { headers: CACHE_HEADERS })
    case 'fund':
      return NextResponse.json(fundLogo(value), { headers: CACHE_HEADERS })
    case 'bank':
      return NextResponse.json(bankLogo(value), { headers: CACHE_HEADERS })
    default:
      return NextResponse.json({ error: 'type must be stock, fund, or bank' }, { status: 400 })
  }
}
