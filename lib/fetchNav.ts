/**
 * Fetches current NAV for a Pakistani mutual fund from MUFAP (Mutual Funds
 * Association of Pakistan) via our own /api/mufap/funds proxy — see that
 * route for why it scrapes MUFAP's public Fund Directory page rather than
 * calling their (broken, 500ing) JSON API directly.
 *
 * The fund is looked up by fuzzy name match against MUFAP's own naming
 * (users type a fund name freehand, which rarely matches MUFAP's exact
 * string byte-for-byte). Falls back to a manual override NAV if no
 * confident match is found or the fetch fails.
 */

export interface MufapFund {
  fundId: string
  name: string
  amc: string
  nav: number
  offerPrice: number
  category: string
}

export interface NavResult {
  nav: number
  source: 'live' | 'override' | 'failed'
  fetchedAt: string
  matchedName?: string
}

export interface MufapFundsData {
  funds: MufapFund[]
  updatedAt: string | null
}

let dataCache: MufapFundsData | null = null
let dataCachePromise: Promise<MufapFundsData> | null = null
const sessionCache = new Map<string, NavResult>()

// The funds list (with each fund's current NAV) comes from a daily snapshot
// stored server-side by a cron job, not a live per-request scrape — see
// app/api/mufap/funds/route.ts and app/api/cron/mufap-sync/route.ts.
export async function fetchMufapFundsData(): Promise<MufapFundsData> {
  if (dataCache) return dataCache
  if (dataCachePromise) return dataCachePromise

  dataCachePromise = (async () => {
    try {
      const res = await fetch('/api/mufap/funds', { signal: AbortSignal.timeout(15000) })
      if (!res.ok) throw new Error(`Failed to fetch funds (${res.status})`)
      const data = (await res.json()) as MufapFundsData
      dataCache = data
      return data
    } catch {
      dataCachePromise = null
      return { funds: [], updatedAt: null }
    }
  })()

  return dataCachePromise
}

export async function fetchMufapFunds(): Promise<MufapFund[]> {
  return (await fetchMufapFundsData()).funds
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// Fund names typed by users rarely match MUFAP's exact string (extra/missing
// "Fund", "Limited", punctuation differences) — normalized exact match first,
// then substring containment either direction as a reasonable fallback.
function findBestMatch(fundName: string, funds: MufapFund[]): MufapFund | null {
  const target = normalize(fundName)
  if (!target) return null

  const exact = funds.find(f => normalize(f.name) === target)
  if (exact) return exact

  const contains = funds.filter(f => {
    const n = normalize(f.name)
    return n.includes(target) || target.includes(n)
  })
  if (contains.length === 1) return contains[0]
  if (contains.length > 1) {
    // Prefer the closest containment match — the smallest name.
    return contains.sort((a, b) => normalize(a.name).length - normalize(b.name).length)[0]
  }

  return null
}

export async function fetchNav(
  fundName: string,
  navOverride: number | null
): Promise<NavResult> {
  const cacheKey = fundName.toLowerCase().trim()
  const cached = sessionCache.get(cacheKey)
  if (cached) return cached

  const funds = await fetchMufapFunds()
  const match = findBestMatch(fundName, funds)

  if (match) {
    const result: NavResult = {
      nav: match.nav,
      source: 'live',
      fetchedAt: new Date().toISOString(),
      matchedName: match.name,
    }
    sessionCache.set(cacheKey, result)
    return result
  }

  if (navOverride !== null && navOverride > 0) {
    const result: NavResult = {
      nav: navOverride,
      source: 'override',
      fetchedAt: new Date().toISOString(),
    }
    sessionCache.set(cacheKey, result)
    return result
  }

  return { nav: 0, source: 'failed', fetchedAt: new Date().toISOString() }
}

export function clearNavCache() {
  sessionCache.clear()
  dataCache = null
  dataCachePromise = null
}
