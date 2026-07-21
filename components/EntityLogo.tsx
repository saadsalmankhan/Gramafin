'use client'

import { useState } from 'react'

interface Props {
  initials: string
  color: string
  logoSrc?: string
  size?: 'sm' | 'md'
}

const BADGE_SIZE = {
  sm: 'w-7 h-7 text-[9px]',
  md: 'w-9 h-9 text-[10px]',
}

// Real bank logos are almost all wide wordmarks, not square icon marks —
// forcing them into the same square badge as the colored-initials fallback
// squeezed them down to near-illegible slivers. Fixed height, flexible
// (capped) width lets a wordmark render at a readable size instead.
const LOGO_SIZE = {
  sm: 'h-8 max-w-[72px]',
  md: 'h-10 max-w-[92px]',
}

export default function EntityLogo({ initials, color, logoSrc, size = 'sm' }: Props) {
  const [failed, setFailed] = useState(false)

  if (logoSrc && !failed) {
    return (
      <div className={`${LOGO_SIZE[size]} rounded-md flex-shrink-0 flex items-center justify-center bg-white border border-gray-100 px-2 py-1.5`}>
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
