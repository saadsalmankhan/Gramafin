import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPageLayout from '@/components/LegalPageLayout'

// See app/(auth)/layout.tsx — the CSP nonce is per-request.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Terms of Use — Gramafin',
  description: 'The terms that govern your use of Gramafin.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-ink-primary mb-3">{title}</h2>
      <div className="text-sm text-ink-secondary leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function TermsOfUsePage() {
  return (
    <LegalPageLayout title="Terms of Use" lastUpdated="July 7, 2026">
      <Section title="Acceptance">
        <p>
          By creating a Gramafin account or otherwise using the service, you agree to these Terms of Use. If you
          don&apos;t agree, please don&apos;t use Gramafin.
        </p>
      </Section>

      <Section title="What Gramafin is">
        <p>
          Gramafin is a personal budgeting and net-worth tracking tool for expenses, income, assets, investments,
          and mutual funds, denominated in Pakistani Rupees. You manually enter your own financial figures — the
          service does not connect to your bank accounts and does not move, hold, or have access to your money.
        </p>
      </Section>

      <Section title="Not financial advice">
        <p>
          Gramafin is a record-keeping and visualization tool, not a financial advisor, broker, or bank. Nothing
          in the app — including net worth calculations, portfolio charts, or mutual fund NAV figures — is
          investment, tax, or legal advice. Make your own decisions, and consult a licensed professional for
          advice specific to your situation.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You&apos;re responsible for the accuracy of the information you provide, for keeping your password
          confidential, and for all activity under your account. One account per person. You must be 18 or older
          to use Gramafin.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use Gramafin for any unlawful purpose</li>
          <li>Attempt to bypass rate limits, security controls, or access another user&apos;s data</li>
          <li>Scrape, reverse-engineer, or overload the service</li>
          <li>Upload malicious files or content that infringes on others&apos; rights</li>
        </ul>
        <p>We may suspend or terminate accounts that violate these terms.</p>
      </Section>

      <Section title="Pricing">
        <p>
          Gramafin is currently free to use. If that changes in the future, we&apos;ll give existing users advance
          notice before introducing any charges.
        </p>
      </Section>

      <Section title="Data accuracy">
        <p>
          Figures you enter (balances, investment values, mutual fund units) and any values fetched from
          third-party sources (such as mutual fund NAVs) may be incomplete, delayed, or inaccurate. Gramafin
          displays this information as a convenience; verify anything important against your bank, brokerage, or
          fund manager directly.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          You can stop using Gramafin and request deletion of your data at any time by emailing{' '}
          <a href="mailto:saad@gramafin.com" className="text-brand-600 hover:underline">saad@gramafin.com</a>. We
          may suspend or terminate access for violation of these terms or misuse of the service.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          Gramafin is provided &ldquo;as is&rdquo;, without warranties of any kind. To the fullest extent
          permitted by law, we are not liable for any financial decisions made using the app, or for indirect,
          incidental, or consequential damages arising from your use of the service.
        </p>
      </Section>

      <Section title="Governing law">
        <p>These terms are governed by the laws of Pakistan.</p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms from time to time; the date at the top of this page reflects the latest
          revision. Continued use after a change means you accept the updated terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions? Email <a href="mailto:saad@gramafin.com" className="text-brand-600 hover:underline">saad@gramafin.com</a>.
          See also our <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link> and{' '}
          <Link href="/legal" className="text-brand-600 hover:underline">Legal notices</Link>.
        </p>
      </Section>
    </LegalPageLayout>
  )
}
