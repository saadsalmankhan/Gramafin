import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { APP_ROUTE_PREFIXES } from '@/lib/routes'

const APP_HOST = 'app.gramafin.com'
const MARKETING_HOSTS = ['gramafin.com', 'www.gramafin.com']

const PROTECTED_PREFIXES = APP_ROUTE_PREFIXES

function hostMatches(host: string, target: string) {
  return host === target || host.startsWith(`${target}:`)
}

// Sanity Studio (an embedded third-party admin app) ships its own inline
// styles/scripts that a strict CSP can't predict, and it's an internal admin
// surface rather than the user-facing app — so it's exempted from the CSP
// but still gets every other hardening header.
function isStudioPath(pathname: string) {
  return pathname === '/studio' || pathname.startsWith('/studio/')
}

function buildCsp(nonce: string): string {
  // Next.js dev mode compiles with webpack's eval-based devtool, which needs
  // 'unsafe-eval' to run at all. Production builds don't eval script text, so
  // this only loosens the policy locally — never in the deployed app.
  const scriptSrc = process.env.NODE_ENV === 'development'
    ? `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`

  return [
    `default-src 'self'`,
    scriptSrc,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    // Vercel's Next.js image optimizer redirects /_next/image requests to the
    // project's canonical domain (app.gramafin.com) to fetch local images when
    // a request comes in on one of the other attached domains (gramafin.com,
    // www.gramafin.com) — so it has to be an allowed img-src everywhere, not
    // just 'self', or that redirect gets CSP-blocked and images break.
    `img-src 'self' https://app.gramafin.com data: blob: https://cdn.sanity.io`,
    `font-src 'self' https://fonts.gstatic.com`,
    // On the marketing domains, Next's client-side Link prefetching/RSC
    // fetches for any path other than "/" target app.gramafin.com (where
    // middleware redirects them). Allowing that in connect-src doesn't
    // actually help — app.gramafin.com doesn't send CORS headers for those
    // responses, so the browser still blocks reading them, just via CORS
    // instead of CSP. Next already falls back to a full page reload either
    // way, so this stays 'self'-only rather than sending a request that's
    // guaranteed to fail regardless.
    `connect-src 'self' https://*.sanity.io https://challenges.cloudflare.com`,
    // Cloudflare Turnstile's widget renders in an iframe — default-src
    // wouldn't allow it otherwise. Harmless to include even before
    // NEXT_PUBLIC_TURNSTILE_SITE_KEY is set (see lib/turnstile.ts); it's
    // simply unused until then.
    `frame-src https://challenges.cloudflare.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

// The session cookie moved from host-only (app.gramafin.com) to shared
// across *.gramafin.com (see lib/auth/options.ts) so a logged-in visitor
// could be recognized on the marketing domain too. Anyone who was already
// logged in before that change has a lingering host-only cookie with the
// same name that sign-out's Set-Cookie (scoped to the new Domain) never
// touches — it stays valid and can silently re-authenticate them after they
// "log out". This clears that legacy cookie shape on every response until
// it's had time to flush out of active sessions.
function clearLegacyHostOnlyCookie(res: NextResponse) {
  // Matches the isOnVercel check in lib/auth/options.ts — that's what decides
  // whether the real session cookie uses the __Secure- prefixed name this is
  // cleaning up after. NODE_ENV would be 'production' on local `npm run
  // start` too, where this cookie name was never in use.
  if (process.env.VERCEL) {
    res.headers.append('Set-Cookie', '__Secure-next-auth.session-token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax')
  }
}

function applySecurityHeaders(res: NextResponse, pathname: string, nonce: string) {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  if (!isStudioPath(pathname)) {
    res.headers.set('Content-Security-Policy', buildCsp(nonce))
  }
  clearLegacyHostOnlyCookie(res)
  return res
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const { pathname, search } = req.nextUrl
  const nonce = btoa(crypto.randomUUID())

  if (MARKETING_HOSTS.some(h => hostMatches(host, h))) {
    if (pathname !== '/') {
      const res = NextResponse.redirect(new URL(`https://${APP_HOST}${pathname}${search}`))
      return applySecurityHeaders(res, pathname, nonce)
    }

    // The session cookie is shared across *.gramafin.com (see cookies.sessionToken
    // in lib/auth/options.ts), so a logged-in visitor hitting the marketing
    // homepage should land on their dashboard instead of seeing the pitch again.
    const token = await getToken({ req })
    if (token) {
      const res = NextResponse.redirect(new URL(`https://${APP_HOST}/dashboard`))
      return applySecurityHeaders(res, pathname, nonce)
    }
  }

  if (hostMatches(host, APP_HOST)) {
    if (pathname === '/') {
      const token = await getToken({ req })
      const res = NextResponse.redirect(new URL(token ? '/dashboard' : '/login', req.url))
      return applySecurityHeaders(res, pathname, nonce)
    }

    if (PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      const token = await getToken({ req })
      if (!token) {
        const loginUrl = new URL('/login', req.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        const res = NextResponse.redirect(loginUrl)
        return applySecurityHeaders(res, pathname, nonce)
      }
    }
  }

  // Forward the nonce to the app via a request header (rather than only the
  // response) so Next.js can find it and stamp it onto the inline scripts it
  // injects for RSC hydration — see Next's CSP nonce guide.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  if (!isStudioPath(pathname)) {
    requestHeaders.set('Content-Security-Policy', buildCsp(nonce))
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  return applySecurityHeaders(res, pathname, nonce)
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
}
