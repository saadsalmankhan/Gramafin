'use client'

import { useState } from 'react'

interface Props {
  initials: string
  color: string
  logoSrc?: string
  size?: 'sm' | 'md'
}

const SIZE_CLASSES = {
  sm: 'w-7 h-7 text-[9px]',
  md: 'w-9 h-9 text-[10px]',
}

export default function EntityLogo({ initials, color, logoSrc, size = 'sm' }: Props) {
  const [failed, setFailed] = useState(false)

  if (logoSrc && !failed) {
    return (
      <div className={`${SIZE_CLASSES[size]} rounded-md flex-shrink-0 flex items-center justify-center bg-white border border-gray-100 p-1`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static badge icon, not worth next/image's fixed-dimension ceremony */}
        <img src={logoSrc} alt="" className="w-full h-full object-contain" onError={() => setFailed(true)} />
      </div>
    )
  }

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-md flex-shrink-0 flex items-center justify-center font-bold`}
      style={{ background: color + '18', color }}
    >
      {initials}
    </div>
  )
}
