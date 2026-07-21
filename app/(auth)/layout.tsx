import { headers } from 'next/headers'

// Forced dynamic so the per-request CSP nonce (see middleware.ts) actually
// lands on these pages' hydration scripts — a statically-optimized page can't
// carry a nonce that changes every request, which would silently break login/
// signup form submission once the CSP header is in place.
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get('x-nonce') ?? undefined
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  return (
    <div className="min-h-screen bg-white">
      {/* Loaded here (not inside a client component) so the script tag can
          carry the per-request nonce CSP's strict-dynamic requires — see
          components/TurnstileWidget.tsx, which just waits for
          window.turnstile to exist rather than loading its own copy. Only
          rendered when a site key is actually configured. */}
      {siteKey && <script nonce={nonce} src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      {children}
    </div>
  )
}
