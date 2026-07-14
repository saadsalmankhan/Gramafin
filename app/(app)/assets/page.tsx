'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Asset, ASSET_CATEGORIES, AssetCategory, isLiabilityCategory, ASSET_COLORS } from '@/types'
import { fmt, pct, uid, daysUntil } from '@/lib/utils'
import { computeNetWorth } from '@/lib/networth'
import MetricCard from '@/components/MetricCard'
import PageHeader from '@/components/PageHeader'
import NetWorthContribution from '@/components/NetWorthContribution'
import ConfirmDialog from '@/components/ConfirmDialog'
import PayCreditCardModal from '@/components/PayCreditCardModal'
import { Plus, Trash2, TrendingUp, TrendingDown, CreditCard, CheckCircle } from 'lucide-react'

function utilizationColor(p: number): string {
  return p < 70 ? '#15803d' : p < 90 ? '#d97706' : '#dc2626'
}

export default function AssetsPage() {
  const { state, addAsset, deleteAsset, payAssetCard } = useStore()
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [category, setCategory] = useState<AssetCategory>('Cash / Bank')
  const [creditLimit, setCreditLimit] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [minimumPayment, setMinimumPayment] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [payTarget, setPayTarget] = useState<Asset | null>(null)

  const isCreditCard = category === 'Credit card'

  const assets = state.assets.filter(a => !isLiabilityCategory(a.category))
  const liabilities = state.assets.filter(a => isLiabilityCategory(a.category))
  const totalAssets = assets.reduce((s, a) => s + a.value, 0)
  const totalLiab = liabilities.reduce((s, a) => s + a.value, 0)
  const netWorth = totalAssets - totalLiab
  const overallNetWorth = computeNetWorth(state).netWorth

  function add() {
    if (!name.trim()) { setError('Name is required'); return }
    const val = parseFloat(value)
    if (isNaN(val) || val <= 0) { setError('Enter a valid value'); return }

    let limit: number | undefined
    if (isCreditCard) {
      limit = parseFloat(creditLimit)
      if (isNaN(limit) || limit <= 0) { setError('Enter a valid credit limit'); return }
    }

    setError('')
    const asset: Asset = {
      id: uid(),
      name: name.trim(),
      value: val,
      category,
      ...(isCreditCard && {
        creditLimit: limit,
        dueDate: dueDate || undefined,
        minimumPayment: minimumPayment ? parseFloat(minimumPayment) : undefined,
      }),
    }
    addAsset(asset)
    setName('')
    setValue('')
    setCreditLimit('')
    setDueDate('')
    setMinimumPayment('')
  }

  function AssetRow({ a }: { a: Asset }) {
    const base = isLiabilityCategory(a.category) ? totalLiab : totalAssets
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
            isLiabilityCategory(a.category) ? 'text-danger' : 'text-success'
          }`}
        >
          {fmt(a.value)}
        </span>
        <button
          className="btn-danger flex-shrink-0"
          onClick={() => setDeleteTarget(a)}
          aria-label="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  function CreditCardRow({ a }: { a: Asset }) {
    const limit = a.creditLimit ?? 0
    const utilization = limit > 0 ? Math.min(100, Math.round((a.value / limit) * 100)) : 0
    const color = utilizationColor(utilization)
    return (
      <div className="py-3 px-2 hover:bg-surface-0 rounded-lg transition-colors">
        <div className="flex items-center gap-4">
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: ASSET_COLORS['Credit card'] + '18' }}
          >
            <CreditCard className="w-4 h-4" style={{ color: ASSET_COLORS['Credit card'] }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-primary truncate">{a.name}</p>
            <p className="text-[11px] text-ink-muted">
              Limit {fmt(limit)}
              {a.dueDate && ` · Due ${a.dueDate}`}
              {a.minimumPayment ? ` · Min payment ${fmt(a.minimumPayment)}` : ''}
              {a.dueDate && (() => {
                const d = daysUntil(a.dueDate)
                if (d > 7) return null
                const label = d < 0 ? `Overdue ${Math.abs(d)}d` : d === 0 ? 'Due today' : `Due in ${d}d`
                return (
                  <span className={`ml-1 font-medium ${d <= 3 ? 'text-danger' : 'text-warning'}`}>
                    · {label}
                  </span>
                )
              })()}
            </p>
          </div>
          <div className="w-24 hidden sm:block">
            <div className="h-1.5 bg-surface-1 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${utilization}%`, background: color }} />
            </div>
            <p className="text-[10px] mt-0.5 text-right font-medium" style={{ color }}>
              {utilization}% used
            </p>
          </div>
          <span className="text-sm font-mono font-medium text-danger flex-shrink-0">
            {fmt(a.value)}
          </span>
          {a.value > 0 && (
            <button
              className="btn-ghost h-8 px-2.5 text-xs flex-shrink-0"
              onClick={() => setPayTarget(a)}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Pay
            </button>
          )}
          <button
            className="btn-danger flex-shrink-0"
            onClick={() => setDeleteTarget(a)}
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Net worth" subtitle="Assets, liabilities, and your financial position" />

      <NetWorthContribution label="Assets & liabilities" amount={netWorth} netWorth={overallNetWorth} />

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
        {error && <p className="text-xs text-danger mb-3 bg-red-50 dark:bg-danger/10 px-3 py-2 rounded">{error}</p>}
        <div className="flex gap-3 flex-wrap mb-3">
          <input
            className="input flex-1 min-w-40"
            placeholder="Name (e.g. Meezan Bank savings)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className="input flex-1 min-w-32 font-mono"
            type="number"
            placeholder={isCreditCard ? 'Current balance (PKR)' : 'Value (PKR)'}
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
          {!isCreditCard && (
            <button className="btn-primary" onClick={add}>
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>
        {isCreditCard && (
          <div className="flex gap-3 flex-wrap">
            <input
              className="input flex-1 min-w-32 font-mono"
              type="number"
              placeholder="Credit limit (PKR)"
              value={creditLimit}
              onChange={e => setCreditLimit(e.target.value)}
            />
            <input
              className="input flex-1 min-w-32"
              type="date"
              placeholder="Due date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <input
              className="input flex-1 min-w-32 font-mono"
              type="number"
              placeholder="Minimum payment (PKR)"
              value={minimumPayment}
              onChange={e => setMinimumPayment(e.target.value)}
            />
            <button className="btn-primary" onClick={add}>
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        )}
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
          <div className="divide-y divide-gray-50 dark:divide-white/5">
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
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {liabilities.map(a =>
              a.category === 'Credit card'
                ? <CreditCardRow key={a.id} a={a} />
                : <AssetRow key={a.id} a={a} />
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.name}"?`}
        message={`This will permanently remove this ${deleteTarget && isLiabilityCategory(deleteTarget.category) ? 'liability' : 'asset'} from your net worth. This can't be undone.`}
        onConfirm={() => {
          if (deleteTarget) deleteAsset(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PayCreditCardModal
        open={payTarget !== null}
        cardLabel={payTarget?.name ?? ''}
        balanceOwed={payTarget?.value ?? 0}
        payFromOptions={state.bankAccounts.filter(b => b.type !== 'Credit Card')}
        onConfirm={(amount, fromAccountId) => {
          if (payTarget) {
            payAssetCard(payTarget.id, amount, fromAccountId)
          }
          setPayTarget(null)
        }}
        onCancel={() => setPayTarget(null)}
      />
    </div>
  )
}
