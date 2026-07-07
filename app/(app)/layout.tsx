import Sidebar from '@/components/Sidebar'

// See app/(auth)/layout.tsx — same reasoning: the CSP nonce is per-request,
// so this subtree can't be statically optimized.
export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 p-8 min-h-screen transition-[margin] duration-200 ease-in-out"
        style={{ marginLeft: 'var(--sidebar-w)' }}
      >
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
