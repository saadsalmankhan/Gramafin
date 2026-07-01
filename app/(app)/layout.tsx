import Sidebar from '@/components/Sidebar'

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
