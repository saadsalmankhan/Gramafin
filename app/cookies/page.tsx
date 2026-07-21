import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPageLayout from '@/components/LegalPageLayout'
import { LEGAL_VERSIONS } from '@/lib/legalVersions'

// See app/(auth)/layout.tsx — the CSP nonce is per-request.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cookie Policy — Gramafin',
  description: 'What cookies Gramafin uses, and why.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-ink-primary mb-3">{title}</h2>
      <div className="text-sm text-ink-secondary leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

const COOKIES = [
  {
    name: '__Secure-next-auth.session-token',
    purpose: 'Keeps you signed in between visits. Identifies your session only.',
    duration: '30 days, or until you log out',
  },
  {
    name: 'next-auth.csrf-token',
    purpose: 'Protects the login form from cross-site request forgery.',
    duration: 'Session (cleared when you close your browser)',
  },
  {
    name: '_interaction, _interaction.sig',
    purpose: 'Set only if you connect an AI assistant like Claude via Settings → Connected apps — tracks that one approval step.',
    duration: 'A few minutes, until the connection is approved or cancelled',
  },
]

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout title="Cookie Policy" lastUpdated={LEGAL_VERSIONS.cookies}>
      <Section title="Overview">
        <p>
          This policy explains what cookies Gramafin sets when you use the app, and why. It should be read
          alongside our <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>,
          which covers your data more broadly.
        </p>
      </Section>

      <Section title="What are cookies?">
        <p>
          Cookies are small text files a website stores in your browser. A site can read them back on later
          visits to recognize you or remember a choice you made. Some cookies (&ldquo;session&rdquo; cookies) are
          deleted automatically when you close your browser; others (&ldquo;persistent&rdquo; cookies) stay until
          they expire or you clear them manually.
        </p>
      </Section>

      <Section title="The cookies we use">
        <p>
          Gramafin only sets <strong className="text-ink-primary">strictly necessary</strong> cookies — the kind
          required for the app to function, mainly keeping you logged in. We do not use analytics,
          functionality/personalization, or advertising and targeting cookies of any kind.
        </p>
        <div className="overflow-x-auto -mx-2 mt-2">
          <table className="w-full text-xs border-collapse min-w-[480px]">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-2 py-2 font-medium text-ink-primary">Cookie</th>
                <th className="px-2 py-2 font-medium text-ink-primary">Purpose</th>
                <th className="px-2 py-2 font-medium text-ink-primary">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {COOKIES.map(c => (
                <tr key={c.name}>
                  <td className="px-2 py-3 font-mono text-[11px] text-ink-primary align-top whitespace-nowrap">{c.name}</td>
                  <td className="px-2 py-3 text-ink-secondary align-top">{c.purpose}</td>
                  <td className="px-2 py-3 text-ink-muted align-top whitespace-nowrap">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We also use your browser&apos;s <strong className="text-ink-primary">local storage</strong> (not
          cookies — this data never leaves your device) for two device-level preferences: dark/light mode and
          sidebar layout, plus a record of your cookie banner choice.
        </p>
      </Section>

      <Section title="Cookies we don't use">
        <p>
          No Google Analytics, no Meta/Facebook Pixel, no advertising networks, no session-replay or heatmap
          tools, and no cross-site tracking of any kind. There&apos;s nothing to opt out of beyond what keeps you
          logged in.
        </p>
      </Section>

      <Section title="Managing cookies">
        <p>
          Because our only cookies are strictly necessary ones, there isn&apos;t a meaningful &ldquo;reject&rdquo;
          option that leaves the app fully working — blocking the session cookie means you&apos;ll be logged out
          on every page load. The cookie banner shown on first visit records your acknowledgment either way and
          won&apos;t reappear.
        </p>
        <p>
          You can also block or delete cookies at any time through your browser&apos;s settings. Doing so for
          Gramafin will simply require you to log in again on your next visit.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If what we collect changes, we&apos;ll update the date at the top of this page. Continued use of
          Gramafin after a change means you accept the updated policy.
        </p>
      </Section>

      <Section title="Related documents">
        <p>
          See also our <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link> and{' '}
          <Link href="/terms" className="text-brand-600 hover:underline">Terms of Use</Link>.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy? Email{' '}
          <a href="mailto:saad@gramafin.com" className="text-brand-600 hover:underline">saad@gramafin.com</a>.
        </p>
      </Section>
    </LegalPageLayout>
  )
}
