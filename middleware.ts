import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

const APP_HOST = 'app.gramafin.com'
const MARKETING_HOSTS = ['gramafin.com', 'www.gramafin.com']

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/income',
  '/expenses',
  '/assets',
  '/budget',
  '/investments',
  '/mutual-funds',
  '/settings',
]

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
    `img-src 'self' data: blob: https://cdn.sanity.io`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://*.sanity.io`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')
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
  return res
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const { pathname, search } = req.nextUrl
  const nonce = btoa(crypto.randomUUID())

  if (MARKETING_HOSTS.some(h => hostMatches(host, h)) && pathname !== '/') {
    const res = NextResponse.redirect(new URL(`https://${APP_HOST}${pathname}${search}`))
    return applySecurityHeaders(res, pathname, nonce)
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
