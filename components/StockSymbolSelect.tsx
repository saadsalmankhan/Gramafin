'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchPsxSymbols } from '@/lib/fetchStockPrice'
import { PsxSymbol } from '@/types'

const MAX_RESULTS = 8

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (symbol: PsxSymbol) => void
  placeholder?: string
}

export default function StockSymbolSelect({ value, onChange, onSelect, placeholder }: Props) {
  const [symbols, setSymbols] = useState<PsxSymbol[]>([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchPsxSymbols().then(setSymbols)
  }, [])

  const query = value.trim().toLowerCase()
  const matches = query.length === 0
    ? []
    : symbols
        .filter(s => s.symbol.toLowerCase().includes(query) || s.name.toLowerCase().includes(query))
        .sort((a, b) => {
          // Symbol prefix matches (e.g. "LUCK" for "lu") rank above name-only matches.
          const aPrefix = a.symbol.toLowerCase().startsWith(query) ? 0 : 1
          const bPrefix = b.symbol.toLowerCase().startsWith(query) ? 0 : 1
          return aPrefix - bPrefix
        })
        .slice(0, MAX_RESULTS)

  function pick(s: PsxSymbol) {
    onSelect(s)
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="input"
        placeholder={placeholder ?? 'Search PSX symbol or company name'}
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
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {matches.map(s => (
            <button
              key={s.symbol}
              type="button"
              // onMouseDown (not onClick) fires before the input's onBlur, so
              // the dropdown selection registers before it gets closed.
              onMouseDown={e => { e.preventDefault(); pick(s) }}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-0 transition-colors"
            >
              <span className="min-w-0">
                <span className="text-sm font-medium text-ink-primary">{s.symbol}</span>
                <span className="block text-[11px] text-ink-muted truncate">{s.name}</span>
              </span>
              <span className="text-[10px] text-ink-muted flex-shrink-0">{s.sectorName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
