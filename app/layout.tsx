import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import SessionProvider from '@/lib/auth/SessionProvider'
import { THEME_KEY } from '@/lib/themeConstants'

export const metadata: Metadata = {
  title: 'Wealth Manager',
  description: 'Personal finance & wealth management in PKR',
}

// Applies the saved theme (or OS preference) before the first paint, so
// there's no flash of the wrong theme while React hydrates. Needs the CSP
// nonce middleware.ts attaches per-request since it's a hand-authored
// inline script, not one of Next's own auto-nonced framework scripts.
const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get('x-nonce') ?? undefined

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-surface-0">
        <SessionProvider>
          <StoreProvider>{children}</StoreProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
