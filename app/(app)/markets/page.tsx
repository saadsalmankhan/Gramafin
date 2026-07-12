'use client'

import { useState } from 'react'
import { PsxSymbol } from '@/types'
import { PSX_INDICES } from '@/lib/psxIndices'
import PageHeader from '@/components/PageHeader'
import MarketChart from '@/components/MarketChart'
import IndexTicker from '@/components/IndexTicker'
import StockSymbolSelect from '@/components/StockSymbolSelect'
import { Search } from 'lucide-react'

const [KSE100, KSE30, ...OTHER_INDICES] = PSX_INDICES

export default function MarketsPage() {
  const [selectedIndex, setSelectedIndex] = useState(OTHER_INDICES[0])
  const [stockQuery, setStockQuery] = useState('')
  const [selectedStock, setSelectedStock] = useState<PsxSymbol | null>(null)

  return (
    <div>
      <PageHeader title="Markets" subtitle="Live PSX index and stock prices" />

      <p className="text-[11px] text-ink-muted -mt-4 mb-6">
        Sourced from PSX's own data portal — during trading hours prices update every minute,
        outside market hours the last close is shown.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <MarketChart symbol={KSE100.code} label={KSE100.label} unit="index" />
        </div>
        <div className="card">
          <MarketChart symbol={KSE30.code} label={KSE30.label} unit="index" />
        </div>
      </div>

      <div className="mb-6">
        <p className="section-label mb-2.5">Other indices</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {OTHER_INDICES.map(idx => (
            <IndexTicker
              key={idx.code}
              code={idx.code}
              label={idx.label}
              active={selectedIndex?.code === idx.code}
              onClick={() => setSelectedIndex(idx)}
            />
          ))}
        </div>
      </div>

      {selectedIndex && (
        <div className="card mb-6">
          <MarketChart symbol={selectedIndex.code} label={selectedIndex.label} unit="index" />
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-ink-muted" />
          <h2 className="text-sm font-medium text-ink-primary">Look up a stock</h2>
        </div>
        <div className="max-w-md mb-4">
          <StockSymbolSelect
            value={stockQuery}
            onChange={setStockQuery}
            onSelect={s => { setSelectedStock(s); setStockQuery(s.name) }}
            placeholder="Search PSX symbol or company (e.g. LUCK, Engro)"
          />
        </div>
        {selectedStock ? (
          <MarketChart
            key={selectedStock.symbol}
            symbol={selectedStock.symbol}
            label={`${selectedStock.symbol} — ${selectedStock.name}`}
            unit="PKR"
          />
        ) : (
          <div className="h-40 flex items-center justify-center text-sm text-ink-muted">
            Search for a stock above to see its price chart
          </div>
        )}
      </div>
    </div>
  )
}
