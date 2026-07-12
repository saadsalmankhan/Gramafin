'use client'

import { useEffect } from 'react'
import { Investment } from '@/types'
import { fmt, gainPct } from '@/lib/utils'
import MarketChart from '@/components/MarketChart'
import { X, TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  investment: Investment | null
  onClose: () => void
}

export default function StockDetailModal({ investment, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!investment || !investment.symbol) return null

  const gain = investment.currentValue - investment.amountInvested
  const gp = gainPct(investment.amountInvested, investment.currentValue)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-medium text-ink-primary">{investment.name}</h2>
            <p className="text-xs text-ink-muted">{investment.symbol} · PSX</p>
          </div>
          <button className="btn-ghost h-8 px-2" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface-0 rounded-lg p-3">
            <p className="section-label mb-1">Shares held</p>
            <p className="text-sm font-mono font-medium text-ink-primary">{investment.sharesHeld}</p>
          </div>
          <div className="bg-surface-0 rounded-lg p-3">
            <p className="section-label mb-1">Buy price</p>
            <p className="text-sm font-mono font-medium text-ink-primary">
              {investment.buyPrice ? fmt(investment.buyPrice) : '—'}
            </p>
          </div>
          <div className="bg-surface-0 rounded-lg p-3">
            <p className="section-label mb-1">Invested</p>
            <p className="text-sm font-mono font-medium text-ink-primary">{fmt(investment.amountInvested)}</p>
          </div>
          <div className="bg-surface-0 rounded-lg p-3">
            <p className="section-label mb-1">Current value</p>
            <p className="text-sm font-mono font-medium text-ink-primary">{fmt(investment.currentValue)}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {gain >= 0
                ? <TrendingUp className="w-3 h-3 text-success" />
                : <TrendingDown className="w-3 h-3 text-danger" />
              }
              <span className={`text-[11px] font-mono font-medium ${gain >= 0 ? 'text-success' : 'text-danger'}`}>
                {gain >= 0 ? '+' : ''}{fmt(gain)} ({gp}%)
              </span>
            </div>
          </div>
        </div>

        <MarketChart symbol={investment.symbol} label={`${investment.symbol} price`} unit="PKR" />
      </div>
    </div>
  )
}
