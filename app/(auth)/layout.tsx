// Forced dynamic so the per-request CSP nonce (see middleware.ts) actually
// lands on these pages' hydration scripts — a statically-optimized page can't
// carry a nonce that changes every request, which would silently break login/
// signup form submission once the CSP header is in place.
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>
}
