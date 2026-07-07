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
    <LegalPageLayout title="Privacy Policy" lastUpdated="July 7, 2026">
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
        <p>Each of these providers processes data only as needed to deliver their part of the service to us.</p>
      </Section>

      <Section title="Cookies">
        <p>
          Gramafin sets a single session cookie (managed by our authentication system) so you stay logged in. We
          do not use third-party advertising or tracking cookies.
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
