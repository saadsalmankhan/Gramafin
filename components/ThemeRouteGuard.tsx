'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { THEME_KEY } from '@/lib/themeConstants'
import { isAppRoute } from '@/lib/routes'

// The inline theme script in app/layout.tsx only runs once, on the initial
// HTML response, and only adds the dark class — it never removes it. Since
// <html>/<body> persist across Next.js client-side navigations (no full page
// reload), a user who enables dark mode in Settings and then clicks a link
// out to a marketing/help page within the same session would still see the
// dark class applied there. This keeps the class in sync on every route
// change, not just the first load.
export default function ThemeRouteGuard() {
  const pathname = usePathname()

  useEffect(() => {
    if (isAppRoute(pathname)) {
      let stored: string | null = null
      try {
        stored = localStorage.getItem(THEME_KEY)
      } catch {}
      const wantsDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', wantsDark)
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [pathname])

  return null
}
