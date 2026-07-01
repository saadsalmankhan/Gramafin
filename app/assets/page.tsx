'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Asset, ASSET_CATEGORIES, AssetCategory } from '@/types'
import { fmt, pct, uid } from '@/lib/utils'
import MetricCard from '@/components/MetricCard'
import PageHeader from '@/components/PageHeader'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'

const ASSET_COLORS: Record<AssetCategory, string> = {
  'Cash / Bank':      '#2a78d6',
  'Real estate':      '#1baf7a',
  'Stocks':           '#4a3aa7',
  'Mutual funds':     '#eda100',
  'Gold / Jewelry':   '#eb6834',
  'Tangible assets':  '#e87ba4',
  'Liability':        '#e34948',
}

export default function AssetsPage() {
  const { state, dispatch } = useStore()
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [category, setCategory] = useState<AssetCategory>('Cash / Bank')
  const [error, setError] = useState('')

  const assets = state.assets.filter(a => a.category !== 'Liability')
  const liabilities = state.assets.filter(a => a.category === 'Liability')
  const totalAssets = assets.reduce((s, a) => s + a.value, 0)
  const totalLiab = liabilities.reduce((s, a) => s + a.value, 0)
  const netWorth = totalAssets - totalLiab

  function add() {
    if (!name.trim()) { setError('Name is required'); return }
    const val = parseFloat(value)
    if (isNaN(val) || val <= 0) { setError('Enter a valid value'); return }
    setError('')
    const asset: Asset = { id: uid(), name: name.trim(), value: val, category }
    dispatch({ type: 'ADD_ASSET', payload: asset })
    setName('')
    setValue('')
  }

  function AssetRow({ a }: { a: Asset }) {
    const base = a.category === 'Liability' ? totalLiab : totalAssets
    const share = pct(a.value, base)
    const color = ASSET_COLORS[a.category]
    return (
      <div className="flex items-center gap-4 py-3 hover:bg-surface-0 rounded-lg px-2 transition-colors">
        <div
          className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
          style={{ background: color + '18', color }}
        >
          {a.category.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-primary truncate">{a.name}</p>
          <p className="text-[11px] text-ink-muted">{a.category}</p>
        </div>
        {/* bar */}
        <div className="w-24 hidden sm:block">
          <div className="h-1.5 bg-surface-1 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${share}%`, background: color }}
            />
          </div>
          <p className="text-[10px] text-ink-muted mt-0.5 text-right">{share}%</p>
        </div>
        <span
          className={`text-sm font-mono font-medium flex-shrink-0 ${
            a.category === 'Liability' ? 'text-danger' : 'text-success'
          }`}
        >
          {fmt(a.value)}
        </span>
        <button
          className="btn-danger flex-shrink-0"
          onClick={() => dispatch({ type: 'DELETE_ASSET', payload: a.id })}
          aria-label="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Net worth" subtitle="Assets, liabilities, and your financial position" />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard label="Total assets" value={fmt(totalAssets)} variant="positive" />
        <MetricCard label="Total liabilities" value={fmt(totalLiab)} variant="negative" />
        <MetricCard
          label="Net worth"
          value={fmt(netWorth)}
          variant={netWorth >= 0 ? 'positive' : 'negative'}
          sub={netWorth >= 0 ? 'positive position' : 'negative position'}
        />
      </div>

      {/* Add form */}
      <div className="card mb-6">
        <h2 className="text-sm font-medium text-ink-primary mb-4">Add asset or liability</h2>
        {error && <p className="text-xs text-danger mb-3 bg-red-50 px-3 py-2 rounded">{error}</p>}
        <div className="flex gap-3 flex-wrap">
          <input
            className="input flex-1 min-w-40"
            placeholder="Name (e.g. Meezan Bank savings)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className="input flex-1 min-w-32 font-mono"
            type="number"
            placeholder="Value (PKR)"
            value={value}
            onChange={e => setValue(e.target.value)}
          />
          <select
            className="select flex-1 min-w-36"
            value={category}
            onChange={e => setCategory(e.target.value as AssetCategory)}
          >
            {ASSET_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={add}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Assets */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-success" />
          <h2 className="text-sm font-medium text-ink-primary">Assets</h2>
          <span className="text-ink-muted text-sm font-mono ml-auto">{fmt(totalAssets)}</span>
        </div>
        {assets.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-6">No assets added yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {assets.map(a => <AssetRow key={a.id} a={a} />)}
          </div>
        )}
      </div>

      {/* Liabilities */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="w-4 h-4 text-danger" />
          <h2 className="text-sm font-medium text-ink-primary">Liabilities</h2>
          <span className="text-ink-muted text-sm font-mono ml-auto">{fmt(totalLiab)}</span>
        </div>
        {liabilities.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-6">No liabilities added yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {liabilities.map(a => <AssetRow key={a.id} a={a} />)}
          </div>
        )}
      </div>
    </div>
  )
}
