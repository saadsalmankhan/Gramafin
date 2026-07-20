import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import HelpSidebar from '@/components/help/HelpSidebar'

// See app/(auth)/layout.tsx — the CSP nonce is per-request.
export const dynamic = 'force-dynamic'

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full">
        <HelpSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <PublicFooter />
    </div>
  )
}
