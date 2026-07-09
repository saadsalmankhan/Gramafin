// No 'use client' directive — this needs to be importable as a plain string
// from the server-rendered root layout (app/layout.tsx) for the no-flash
// inline theme script. Importing it from lib/theme.ts instead would pull in
// that module's 'use client' boundary, which turns named exports into
// client-reference objects when read from a Server Component (stringifies
// to "[object Object]" instead of the real value) — this file exists purely
// to dodge that.
export const THEME_KEY = 'gramafin-theme'
