import Link from 'next/link'
import Image from 'next/image'

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo-full.png" alt="Gramafin" width={505} height={126} className="h-6 w-auto" priority />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink-secondary hover:text-ink-primary transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="h-9 px-4 rounded-full bg-ink-primary text-white text-sm font-medium flex items-center hover:bg-black transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs text-ink-muted">Gramafin — personal finance in PKR</p>
        </div>
      </footer>
    </div>
  )
}
