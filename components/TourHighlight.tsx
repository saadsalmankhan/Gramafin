'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface Props {
  label: string
  children: React.ReactNode
}

// Wraps whatever "Add X" section a quick-start-guide or dashboard-checklist
// CTA linked to with ?tour=1. Scrolls it into view and highlights it for a
// few seconds so it's obvious where to look, then settles back to normal —
// read once from the URL on mount, not kept live in sync with it.
export default function TourHighlight({ label, children }: Props) {
  const searchParams = useSearchParams()
  const active = searchParams?.get('tour') === '1'
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(active)

  useEffect(() => {
    if (!active) return
    const scrollTimer = setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    const hideTimer = setTimeout(() => setShow(false), 6000)
    return () => {
      clearTimeout(scrollTimer)
      clearTimeout(hideTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!show) return <>{children}</>

  return (
    <div ref={ref} className="relative rounded-xl ring-2 ring-brand-500 ring-offset-4 ring-offset-surface-0">
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1 text-xs font-medium text-white bg-brand-600 px-2.5 py-1 rounded-full shadow-md z-10">
        👉 {label}
      </div>
      {children}
    </div>
  )
}
