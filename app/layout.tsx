import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import SessionProvider from '@/lib/auth/SessionProvider'
import { THEME_KEY } from '@/lib/themeConstants'
import { APP_ROUTE_PREFIXES } from '@/lib/routes'
import ThemeRouteGuard from '@/components/ThemeRouteGuard'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Gramafin',
  description: 'Personal finance & wealth management in PKR',
  openGraph: {
    title: 'Gramafin',
    description: 'Personal finance & wealth management in PKR',
    images: ['/logo-mark.png'],
  },
}

// Applies the saved theme (or OS preference) before the first paint, so
// there's no flash of the wrong theme while React hydrates. Scoped to the
// authenticated app shell only (see lib/routes.ts) — marketing/auth pages
// (login, signup, homepage, help, legal) are a separately-designed
// light-only surface and must never pick up dark mode, even from an OS-level
// prefers-color-scheme match. Needs the CSP nonce middleware.ts attaches
// per-request since it's a hand-authored inline script, not one of Next's
// own auto-nonced framework scripts.
const themeScript = `(function(){try{var p=${JSON.stringify(APP_ROUTE_PREFIXES)};var path=location.pathname;var isApp=p.some(function(x){return path===x||path.indexOf(x+'/')===0});if(!isApp)return;var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get('x-nonce') ?? undefined

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-surface-0">
        <SessionProvider>
          <StoreProvider>
            <ThemeRouteGuard />
            {children}
          </StoreProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
