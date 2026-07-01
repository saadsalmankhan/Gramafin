/**
 * Fetches current NAV for a Pakistani mutual fund from MUFAP's public data.
 *
 * MUFAP (Mutual Funds Association of Pakistan) publishes daily NAVs at:
 * https://www.mufap.com.pk/nav_returns_performance.php
 *
 * Since MUFAP doesn't have a public JSON API, we use a CORS proxy to fetch
 * the page and parse the NAV table. As a reliable fallback we also support
 * a manual override NAV stored with each fund.
 *
 * Strategy:
 *  1. Try fetching from the allresources.com.pk MUFAP mirror (has CORS headers)
 *  2. Fall back to manual navOverride if set
 *  3. Return null if both fail — UI shows a "fetch failed" state
 */

export interface NavResult {
  nav: number
  source: 'live' | 'override' | 'failed'
  fetchedAt: string
}

// MUFAP publishes a machine-readable JSON via this unofficial mirror
const MUFAP_PROXY = 'https://mufap-api.vercel.app/api/nav'

// We cache results for the session to avoid re-fetching on every render
const sessionCache = new Map<string, NavResult>()

export async function fetchNav(
  fundName: string,
  navOverride: number | null
): Promise<NavResult> {
  const cacheKey = fundName.toLowerCase().trim()
  const cached = sessionCache.get(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(`${MUFAP_PROXY}?fund=${encodeURIComponent(fundName)}`, {
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const data = await res.json() as { nav?: number; name?: string }
      if (data.nav && data.nav > 0) {
        const result: NavResult = {
          nav: data.nav,
          source: 'live',
          fetchedAt: new Date().toISOString(),
        }
        sessionCache.set(cacheKey, result)
        return result
      }
    }
  } catch {
    // network error or timeout — fall through to override
  }

  // Fallback: use manual override NAV
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
}
