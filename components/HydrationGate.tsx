'use client'

import { ReactNode } from 'react'
import { useStore } from '@/lib/store'

// Without this, dropping the old pendingActionsRef replay machinery (see
// lib/store.tsx) would reintroduce the race it existed to prevent: a fast
// click before GET /api/bootstrap resolves could fire against empty initial
// state, then get silently overwritten once the real data loads. Blocking
// render here means no page can even mount — let alone call a store
// function — before hydration finishes. Also fixes the old "$0 net worth
// flashes before real data" rough edge as a side effect.
export default function HydrationGate({ children }: { children: ReactNode }) {
  const { hydrated } = useStore()

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
