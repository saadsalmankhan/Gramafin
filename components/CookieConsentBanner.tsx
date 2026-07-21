'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const STORAGE_KEY = 'gramafin_cookie_consent'

export default function CookieConsentBanner() {
  const { status } = useSession()
  const [visible, setVisible] = useState(false)
  const [managing, setManaging] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
  }, [])

  async function choose(choice: 'accepted' | 'rejected') {
    localStorage.setItem(STORAGE_KEY, choice)
    setVisible(false)
    // Anonymous choices are reconciled into the DB at signup instead (see
    // app/(auth)/signup/page.tsx) — nothing to call yet without a session.
    if (status === 'authenticated') {
      fetch('/api/legal-acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      }).catch(() => {})
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-40 max-w-sm">
      <div className="card shadow-lg">
        {!managing ? (
          <>
            <p className="text-sm text-ink-secondary leading-relaxed mb-3">
              We use cookies to keep you logged in. Nothing more — no analytics, no advertising.{' '}
              <Link href="/cookies" className="text-brand-600 hover:underline">
                See our Cookie Policy.
              </Link>
            </p>
            <div className="space-y-2">
              <button className="btn-primary w-full justify-center" onClick={() => choose('accepted')}>
                Allow all
              </button>
              <button className="btn-ghost w-full justify-center" onClick={() => choose('rejected')}>
                Reject all
              </button>
              <button
                className="text-xs text-ink-muted hover:text-ink-primary transition-colors w-full text-center py-1"
                onClick={() => setManaging(true)}
              >
                Manage cookies
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-ink-primary mb-3">Manage cookies</p>
            <div className="flex items-center justify-between py-2 border-b border-gray-50 mb-3">
              <div>
                <p className="text-xs font-medium text-ink-primary">Strictly necessary</p>
                <p className="text-[11px] text-ink-muted mt-0.5">Keeps you logged in. Always on.</p>
              </div>
              <input type="checkbox" checked disabled />
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed mb-4">
              We don&apos;t use analytics, functionality, or advertising cookies, so there&apos;s nothing else to
              manage here. See the full{' '}
              <Link href="/cookies" className="text-brand-600 hover:underline">
                Cookie Policy
              </Link>
              .
            </p>
            <button className="btn-primary w-full justify-center" onClick={() => choose('accepted')}>
              Save preferences
            </button>
          </>
        )}
      </div>
    </div>
  )
}
