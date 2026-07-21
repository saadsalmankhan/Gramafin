import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'

interface Props {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export default function LegalPageLayout({ title, lastUpdated, children }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 text-xs mb-6">
            {[
              { href: '/privacy', label: 'Privacy Policy' },
              { href: '/terms', label: 'Terms of Use' },
              { href: '/cookies', label: 'Cookie Policy' },
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

          <h1 className="font-display text-2xl sm:text-3xl text-ink-primary tracking-tight mb-2">{title}</h1>
          <p className="text-xs text-ink-muted mb-10">Last updated {lastUpdated}</p>

          <div className="space-y-8">{children}</div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
