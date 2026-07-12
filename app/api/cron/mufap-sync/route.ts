import { NextResponse } from 'next/server'
import { scrapeMufapFundDirectory } from '@/lib/mufapScraper'
import { setMufapCache } from '@/lib/mufapCache'

// Triggered daily by Vercel Cron (see vercel.json) around 8pm Pakistan time —
// after PSX/MUFAP's trading day closes and NAVs for the day are published.
// Not scheduled on weekends (funds don't trade, NAVs don't change), but this
// checks again server-side in case of a manual trigger or retry.
function isWeekendInPakistan(): boolean {
  const day = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi', weekday: 'short' })
  return day === 'Sat' || day === 'Sun'
}

export async function GET(req: Request) {
  // Vercel Cron sends this header automatically when CRON_SECRET is set in
  // the project's env vars — rejects any other caller from triggering a
  // scrape on demand.
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isWeekendInPakistan()) {
    return NextResponse.json({ skipped: true, reason: 'weekend' })
  }

  try {
    const funds = await scrapeMufapFundDirectory()
    const cache = await setMufapCache(funds)
    return NextResponse.json({ ok: true, count: cache.funds.length, updatedAt: cache.updatedAt })
  } catch (err) {
    console.error('mufap-sync cron failed:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 502 })
  }
}
