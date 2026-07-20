'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import QuickStartGuide from './QuickStartGuide'

// Lives inside HydrationGate (see app/(app)/layout.tsx) so it only ever
// mounts once real preferences have loaded — otherwise it would flash
// briefly for users who've already dismissed it, before the fetched
// onboardingDismissed value overwrites the client's optimistic default.
export default function QuickStartGuideGate() {
  const { state, setPreferences } = useStore()
  // Session-only dismiss ("I'll do this later" / Done / close) — not
  // persisted, so it reappears on the next real login. This layout
  // persists across client-side navigation within the app, so this stays
  // dismissed for the rest of the browser session once closed once.
  const [sessionDismissed, setSessionDismissed] = useState(false)

  if (state.preferences.onboardingDismissed || sessionDismissed) return null

  return (
    <QuickStartGuide
      onDismissSession={() => setSessionDismissed(true)}
      onDismissForever={() => {
        setSessionDismissed(true)
        void setPreferences({ onboardingDismissed: true })
      }}
    />
  )
}
