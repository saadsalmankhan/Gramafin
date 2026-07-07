import Link from 'next/link'
import Image from 'next/image'

interface Props {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export default function LegalPageLayout({ title, lastUpdated, children }: Props) {
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

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 text-xs mb-6">
            {[
              { href: '/privacy', label: 'Privacy Policy' },
              { href: '/terms', label: 'Terms of Use' },
              { href: '/legal', label: 'Legal' },
            ].map((l, i) => (
              <span key={l.href} className="flex items-center gap-3">
                {i > 0 && <span className="text-ink-muted">·</span>}
                <Link href={l.href} className="text-ink-muted hover:text-ink-primary transition-colors">
                  {l.label}
                </Link>
              </span>
            ))}
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-ink-primary tracking-tight mb-2">{title}</h1>
          <p className="text-xs text-ink-muted mb-10">Last updated {lastUpdated}</p>

          <div className="space-y-8">{children}</div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs text-ink-muted">Gramafin — personal finance in PKR</p>
        </div>
      </footer>
    </div>
  )
}
