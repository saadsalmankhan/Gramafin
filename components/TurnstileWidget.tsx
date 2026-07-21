'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          appearance?: 'always' | 'execute' | 'interaction-only'
        }
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

interface Props {
  onVerify: (token: string | null) => void
}

// Renders nothing (and never blocks the form) when no site key is
// configured — see lib/turnstile.ts. The <script> tag that makes
// window.turnstile exist is injected server-side in app/(auth)/layout.tsx
// so it can carry the per-request CSP nonce; this component just waits for
// it to be ready rather than loading its own copy.
export default function TurnstileWidget({ onVerify }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!siteKey) return
    if (window.turnstile) {
      setReady(true)
      return
    }
    const interval = setInterval(() => {
      if (window.turnstile) {
        setReady(true)
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [siteKey])

  useEffect(() => {
    if (!ready || !siteKey || !containerRef.current || !window.turnstile) return
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: token => onVerify(token),
      'expired-callback': () => onVerify(null),
      // Stays invisible and runs its check silently in the background —
      // Cloudflare only pops up a visible challenge for sessions its risk
      // engine actually flags, instead of showing a box to every user on
      // every attempt regardless of risk.
      appearance: 'interaction-only',
    })
    return () => {
      if (window.turnstile) window.turnstile.remove(widgetId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onVerify identity churn shouldn't re-mount the widget
  }, [ready, siteKey])

  if (!siteKey) return null
  return <div ref={containerRef} className="my-1" />
}
