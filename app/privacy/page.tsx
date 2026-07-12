import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPageLayout from '@/components/LegalPageLayout'

// See app/(auth)/layout.tsx — the CSP nonce is per-request.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Privacy Policy — Gramafin',
  description: 'How Gramafin collects, stores, and uses your data.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-ink-primary mb-3">{title}</h2>
      <div className="text-sm text-ink-secondary leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="July 12, 2026">
      <Section title="Overview">
        <p>
          Gramafin (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a personal finance tracking tool for expenses,
          budgets, net worth, investments, and mutual funds in Pakistani Rupees. This policy explains what
          information we collect when you use Gramafin, how it&apos;s stored, and how it&apos;s used.
        </p>
      </Section>

      <Section title="What we collect">
        <p><strong className="text-ink-primary">Account information:</strong> your name, email address, and a
          bcrypt-hashed password. We never store your password in plain text.</p>
        <p><strong className="text-ink-primary">Financial data you enter:</strong> expenses, income, budgets,
          assets and liabilities, investments, mutual fund holdings, and bank account labels and balances that
          you type in yourself. Gramafin does not connect to your bank, does not ask for online banking
          credentials, and does not use any account-aggregation service — every number in the app is one you
          entered manually.</p>
        <p><strong className="text-ink-primary">Receipts:</strong> if you attach a receipt image to an expense,
          that image is uploaded to private object storage accessible only to your account.</p>
        <p><strong className="text-ink-primary">Technical data:</strong> standard request metadata (IP address,
          user agent) is processed transiently for security purposes such as rate-limiting abusive requests, and
          is not retained in your account data.</p>
      </Section>

      <Section title="How we store it">
        <p>
          Account records and financial data are stored in Upstash Redis; receipt images are stored in Vercel
          Blob under a private, per-user path that only your authenticated session can read. All traffic to
          Gramafin is encrypted in transit (HTTPS). Passwords are hashed with bcrypt and are never recoverable by
          us in plain text.
        </p>
      </Section>

      <Section title="How we use it">
        <p>
          Your data is used solely to provide the Gramafin service to you: rendering your dashboard, charts, and
          reports, and sending account-related email (verification, password reset, and security notices). We do
          not sell your data, and we do not share your financial data with third parties for advertising or
          marketing purposes.
        </p>
      </Section>

      <Section title="Who else touches your data">
        <p>We rely on a small number of infrastructure providers (&ldquo;subprocessors&rdquo;) to run Gramafin:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink-primary">Vercel</strong> — application hosting</li>
          <li><strong className="text-ink-primary">Upstash</strong> — database (Redis) for account and financial records</li>
          <li><strong className="text-ink-primary">Vercel Blob</strong> — private storage for receipt images</li>
          <li><strong className="text-ink-primary">Resend</strong> — delivery of transactional email (verification, password reset)</li>
          <li><strong className="text-ink-primary">Sanity</strong> — content for the public Help Centre only; it does not receive your account or financial data</li>
        </ul>
        <p>
          None of these providers receive your data for advertising, analytics, or resale — each processes data
          only as needed to deliver their specific part of the service (hosting, storage, or email delivery).
        </p>
      </Section>

      <Section title="Market data we display">
        <p>
          If you track PSX-listed stocks or Pakistani mutual funds, Gramafin fetches public price and NAV data
          from the Pakistan Stock Exchange&apos;s data portal and MUFAP (Mutual Funds Association of Pakistan) to
          display alongside your holdings. This is a one-way, read-only lookup — your portfolio details (what you
          hold, at what price) are never sent to PSX or MUFAP; we only ask them for the current price of a symbol
          or fund name.
        </p>
      </Section>

      <Section title="No analytics, no ad tracking">
        <p>
          Gramafin does not use Google Analytics, Meta/Facebook Pixel, or any other third-party analytics or
          advertising tracker. We don&apos;t build an advertising profile from your usage, and nothing you do in
          the app is sold or shared for marketing purposes — by us or anyone we work with.
        </p>
      </Section>

      <Section title="Cookies and local storage">
        <p>
          Gramafin sets a single session cookie (managed by our authentication system) so you stay logged in — it
          identifies your session only and isn&apos;t used for tracking across other sites. We also use your
          browser&apos;s local storage for two device-level preferences: your dark/light mode choice and sidebar
          layout — these stay on your device, aren&apos;t sent to us, and don&apos;t sync across devices. We do
          not use third-party advertising or tracking cookies.
        </p>
      </Section>

      <Section title="Your rights over your data">
        <p>You can, at any time, by emailing <a href="mailto:saad@gramafin.com" className="text-brand-600 hover:underline">saad@gramafin.com</a> from your account&apos;s address:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-ink-primary">Access</strong> — request a copy of the data we hold on your account</li>
          <li><strong className="text-ink-primary">Correction</strong> — most of your data is editable directly in the app; anything that isn&apos;t, we&apos;ll fix on request</li>
          <li><strong className="text-ink-primary">Deletion</strong> — permanently delete your account and all associated data</li>
          <li><strong className="text-ink-primary">Portability</strong> — request an export of your financial data in a machine-readable format</li>
        </ul>
        <p>Gramafin is a small, single-operator service — these requests are handled by a person, not a self-serve portal, and we aim to respond within a few days.</p>
      </Section>

      <Section title="Where your data is processed">
        <p>
          Our infrastructure providers (Vercel, Upstash, Resend) operate global networks that may process or
          store data outside Pakistan. All data in transit is encrypted (HTTPS); at rest, financial records are
          stored in our database with no public access path.
        </p>
      </Section>

      <Section title="Data retention and deletion">
        <p>
          We retain your data for as long as your account is active. To request deletion of your account and all
          associated data, email <a href="mailto:saad@gramafin.com" className="text-brand-600 hover:underline">saad@gramafin.com</a>{' '}
          from the address on your account — we will confirm and delete your records.
        </p>
      </Section>

      <Section title="Children">
        <p>Gramafin is not directed to, and should not be used by, anyone under the age of 18.</p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we make material changes to this policy, we&apos;ll update the date at the top of this page. Continued
          use of Gramafin after a change means you accept the updated policy.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy? Email{' '}
          <a href="mailto:saad@gramafin.com" className="text-brand-600 hover:underline">saad@gramafin.com</a>. See
          also our <Link href="/terms" className="text-brand-600 hover:underline">Terms of Use</Link> and{' '}
          <Link href="/legal" className="text-brand-600 hover:underline">Legal notices</Link>.
        </p>
      </Section>
    </LegalPageLayout>
  )
}
