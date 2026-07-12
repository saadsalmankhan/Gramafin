'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchMufapFunds, MufapFund } from '@/lib/fetchNav'

const MAX_RESULTS = 8

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (fund: MufapFund) => void
  placeholder?: string
}

export default function MutualFundSelect({ value, onChange, onSelect, placeholder }: Props) {
  const [funds, setFunds] = useState<MufapFund[]>([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchMufapFunds().then(setFunds)
  }, [])

  const query = value.trim().toLowerCase()
  const matches = query.length === 0
    ? []
    : funds
        .filter(f => f.name.toLowerCase().includes(query) || f.amc.toLowerCase().includes(query))
        .sort((a, b) => {
          const aPrefix = a.name.toLowerCase().startsWith(query) ? 0 : 1
          const bPrefix = b.name.toLowerCase().startsWith(query) ? 0 : 1
          return aPrefix - bPrefix
        })
        .slice(0, MAX_RESULTS)

  function pick(f: MufapFund) {
    onSelect(f)
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="input"
        placeholder={placeholder ?? 'Search mutual fund name (e.g. MCB Cash Fund)'}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (e.key === 'Enter' && matches.length > 0) {
            e.preventDefault()
            pick(matches[0])
          }
          if (e.key === 'Escape') setOpen(false)
        }}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-surface-2 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg">
          {matches.map(f => (
            <button
              key={f.fundId}
              type="button"
              // onMouseDown (not onClick) fires before the input's onBlur, so
              // the dropdown selection registers before it gets closed.
              onMouseDown={e => { e.preventDefault(); pick(f) }}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-0 transition-colors"
            >
              <span className="min-w-0">
                <span className="text-sm font-medium text-ink-primary block truncate">{f.name}</span>
                <span className="block text-[11px] text-ink-muted truncate">{f.amc}</span>
              </span>
              <span className="text-xs font-mono text-ink-secondary flex-shrink-0">Rs {f.nav.toFixed(2)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
