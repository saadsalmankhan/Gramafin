import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'

// See app/(auth)/layout.tsx — the CSP nonce is per-request.
export const dynamic = 'force-dynamic'

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
