import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPageLayout from '@/components/LegalPageLayout'

// See app/(auth)/layout.tsx — the CSP nonce is per-request.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Legal — Gramafin',
  description: 'Legal notices, disclaimers, and trademark information for Gramafin.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-ink-primary mb-3">{title}</h2>
      <div className="text-sm text-ink-secondary leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function LegalPage() {
  return (
    <LegalPageLayout title="Legal" lastUpdated="July 12, 2026">
      <Section title="No affiliation">
        <p>
          Gramafin is an independent, standalone personal finance tool. It is not a bank, not a licensed
          financial advisor, brokerage, or investment company, and is not affiliated with, endorsed by, or
          regulated by the State Bank of Pakistan, the Securities and Exchange Commission of Pakistan, or any
          bank, brokerage, or mutual fund manager referenced in the app.
        </p>
      </Section>

      <Section title="Not investment advice">
        <p>
          Nothing displayed in Gramafin — including net worth totals, portfolio performance, or mutual fund NAV
          figures — constitutes investment, tax, or legal advice. Figures are derived from information you enter
          or from third-party data sources, and may be incomplete or out of date. Consult a licensed financial
          professional before making financial decisions.
        </p>
      </Section>

      <Section title="Market data">
        <p>
          Stock prices, index values, and mutual fund NAVs shown in Gramafin are sourced from the Pakistan Stock
          Exchange (PSX) and MUFAP (Mutual Funds Association of Pakistan) for display within your own personal
          portfolio view. Gramafin is not endorsed by, affiliated with, or a licensed redistributor of PSX or
          MUFAP data, and this data is not republished, resold, or made available in bulk. Market data may be
          delayed, incomplete, or temporarily unavailable and should not be relied on for time-sensitive trading
          decisions.
        </p>
      </Section>

      <Section title="Trademarks">
        <p>
          Bank names, mutual fund names, and other third-party marks that appear in Gramafin (for example, in the
          bank-account or mutual-fund selection lists) are the trademarks of their respective owners. They appear
          solely so you can label your own manually-entered financial data, and their use does not imply any
          partnership, sponsorship, or endorsement.
        </p>
      </Section>

      <Section title="Third-party links">
        <p>
          The Gramafin Help Centre may link to third-party sites for further reading. We don&apos;t control and
          aren&apos;t responsible for the content or practices of external sites.
        </p>
      </Section>

      <Section title="Copyright">
        <p>© {new Date().getFullYear()} Gramafin. All rights reserved.</p>
      </Section>

      <Section title="Related documents">
        <p>
          See also our <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link> and{' '}
          <Link href="/terms" className="text-brand-600 hover:underline">Terms of Use</Link>.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          <a href="mailto:saad@gramafin.com" className="text-brand-600 hover:underline">saad@gramafin.com</a>
        </p>
      </Section>
    </LegalPageLayout>
  )
}
