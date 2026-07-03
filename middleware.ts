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

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const { pathname, search } = req.nextUrl

  if (MARKETING_HOSTS.some(h => hostMatches(host, h)) && pathname !== '/') {
    return NextResponse.redirect(new URL(`https://${APP_HOST}${pathname}${search}`))
  }

  if (hostMatches(host, APP_HOST)) {
    if (pathname === '/') {
      const token = await getToken({ req })
      return NextResponse.redirect(new URL(token ? '/dashboard' : '/login', req.url))
    }

    if (PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      const token = await getToken({ req })
      if (!token) {
        const loginUrl = new URL('/login', req.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
}
