import Link from 'next/link'

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-100 py-8">
      <div className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-3">
        <p className="text-xs text-ink-muted">Gramafin — personal finance in PKR</p>
        <div className="flex items-center gap-4 text-xs text-ink-muted">
          <Link href="/privacy" className="hover:text-ink-primary transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-ink-primary transition-colors">Terms</Link>
          <Link href="/legal" className="hover:text-ink-primary transition-colors">Legal</Link>
        </div>
      </div>
    </footer>
  )
}
