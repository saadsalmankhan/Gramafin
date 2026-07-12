// The authenticated app shell's route prefixes — shared by middleware.ts
// (auth gating) and the dark-mode scoping logic (theme script + route
// guard) so the two never drift out of sync. Marketing/auth pages
// (login, signup, homepage, help, legal) are intentionally NOT in this
// list: they're a separately-designed light-only surface, and dark mode
// should never bleed onto them.
export const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/income',
  '/expenses',
  '/assets',
  '/budget',
  '/investments',
  '/mutual-funds',
  '/markets',
  '/settings',
]

export function isAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))
}
