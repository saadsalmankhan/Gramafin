'use client'

import { useState } from 'react'

interface Props {
  initials: string
  color: string
  logoSrc?: string
  size?: 'sm' | 'md'
}

// Same square footprint used everywhere else in the app (expense-category
// badges, stock/fund initials) — a real bank logo gets a white background
// instead of a colored tint, but stays the same size and shape as every
// other entity badge so it doesn't read as a different UI element.
const BADGE_SIZE = {
  sm: 'w-7 h-7 text-[9px]',
  md: 'w-9 h-9 text-[10px]',
}

export default function EntityLogo({ initials, color, logoSrc, size = 'sm' }: Props) {
  const [failed, setFailed] = useState(false)

  if (logoSrc && !failed) {
    return (
      <div className={`${BADGE_SIZE[size]} rounded-md flex-shrink-0 flex items-center justify-center bg-white border border-gray-100 p-1 overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static badge icon, not worth next/image's fixed-dimension ceremony */}
        <img src={logoSrc} alt="" className="w-full h-full object-contain" onError={() => setFailed(true)} />
      </div>
    )
  }

  return (
    <div
      className={`${BADGE_SIZE[size]} rounded-md flex-shrink-0 flex items-center justify-center font-bold`}
      style={{ background: color + '18', color }}
    >
      {initials}
    </div>
  )
}
