import { NextResponse } from 'next/server'
import { apiRatelimit, clientIp } from '@/lib/ratelimit'
import { getMufapCache, setMufapCache } from '@/lib/mufapCache'
import { scrapeMufapFundDirectory } from '@/lib/mufapScraper'

// NAVs are refreshed once/day by the mufap-sync cron (see
// app/api/cron/mufap-sync/route.ts), not on every request — MUFAP's fund
// directory page is a few hundred KB and doesn't change intraday, so
// re-scraping it per visitor would be both slow and needlessly hard on
// their site. This just serves whatever the cron last stored in Redis.
export async function GET(req: Request) {
  const { success } = await apiRatelimit.limit(`mufap-funds:${clientIp(req)}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const cached = await getMufapCache()
    if (cached) {
      return NextResponse.json(cached)
    }

    // Bootstrap case: the cron hasn't run yet (e.g. right after first
    // deploy). Scrape once so the feature isn't dead in the water, and
    // store it so subsequent requests hit the cache too.
    const funds = await scrapeMufapFundDirectory()
    const fresh = await setMufapCache(funds)
    return NextResponse.json(fresh)
  } catch (err) {
    console.error('Failed to serve MUFAP fund data:', err)
    return NextResponse.json({ error: 'Failed to fetch fund data' }, { status: 502 })
  }
}
