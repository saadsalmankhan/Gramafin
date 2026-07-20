'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // sign out after 30 minutes of inactivity
const WARNING_BEFORE_MS = 60 * 1000 // show the warning 60s before that
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const

// Any real activity — including just moving the mouse while the warning is
// up — counts as "still here" and dismisses it, same as Gmail/most banking
// sites. "Stay signed in" is there for the case where someone's reading
// without touching the mouse/keyboard at all, not the only way to extend.
export default function SessionTimeoutGuard() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const lastActivityRef = useRef(Date.now())
  const warningShownRef = useRef(false)

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (warningShownRef.current) {
      warningShownRef.current = false
      setSecondsLeft(null)
    }
  }, [])

  useEffect(() => {
    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, resetActivity, { passive: true })
    return () => {
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, resetActivity)
    }
  }, [resetActivity])

  useEffect(() => {
    const interval = setInterval(() => {
      const remainingMs = IDLE_TIMEOUT_MS - (Date.now() - lastActivityRef.current)
      if (remainingMs <= 0) {
        signOut({ callbackUrl: '/login?idle=1' })
        return
      }
      if (remainingMs <= WARNING_BEFORE_MS) {
        warningShownRef.current = true
        setSecondsLeft(Math.ceil(remainingMs / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (secondsLeft === null) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card max-w-sm w-full">
        <h2 className="text-sm font-medium text-ink-primary mb-2">Still there?</h2>
        <p className="text-sm text-ink-secondary leading-relaxed mb-5">
          You&apos;ve been inactive for a while — for your security, you&apos;ll be signed out in{' '}
          <span className="font-mono font-medium text-ink-primary">{secondsLeft}s</span>.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => signOut({ callbackUrl: '/login?idle=1' })}>
            Sign out now
          </button>
          <button className="btn-primary" onClick={resetActivity} autoFocus>
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}
