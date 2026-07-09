'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Investment, INVESTMENT_TYPES, InvestmentType, INVESTMENT_TYPE_COLORS, PsxSymbol } from '@/types'
import { fmt, fmtCompact, gainPct, uid } from '@/lib/utils'
import { computeNetWorth } from '@/lib/networth'
import { fetchStockPrice } from '@/lib/fetchStockPrice'
import { useChartColors } from '@/lib/theme'
import MetricCard from '@/components/MetricCard'
import PageHeader from '@/components/PageHeader'
import NetWorthContribution from '@/components/NetWorthContribution'
import StockSymbolSelect from '@/components/StockSymbolSelect'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

type PriceStatus = Record<string, 'idle' | 'loading' | 'live' | 'eod' | 'failed'>

export default function InvestmentsPage() {
  const { state, dispatch } = useStore()
  const chartColors = useChartColors()
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState<string | null>(null)
  const [type, setType] = useState<InvestmentType>('Stocks')
  const [cost, setCost] = useState('')
  const [current, setCurrent] = useState('')
  const [shares, setShares] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [priceStatus, setPriceStatus] = useState<PriceStatus>({})
  const [deleteTarget, setDeleteTarget] = useState<Investment | null>(null)

  const totalCost = state.investments.reduce((s, i) => s + i.amountInvested, 0)
  const totalCurrent = state.investments.reduce((s, i) => s + i.currentValue, 0)
  const totalGain = totalCurrent - totalCost
  const overallReturn = gainPct(totalCost, totalCurrent)
  const overallNetWorth = computeNetWorth(state).netWorth

  // Pie data by type
  const byType = INVESTMENT_TYPES.map(t => ({
    name: t,
    value: state.investments
      .filter(i => i.type === t)
      .reduce((s, i) => s + i.currentValue, 0),
  })).filter(d => d.value > 0)

  function resetForm() {
    setName('')
    setSymbol(null)
    setCost('')
    setCurrent('')
    setShares('')
    setBuyPrice('')
  }

  function selectStock(s: PsxSymbol) {
    setSymbol(s.symbol)
    setName(s.name)
  }

  const isTrackedStock = type === 'Stocks' && symbol !== null

  async function add() {
    if (!name.trim()) { setError('Name is required'); return }

    if (isTrackedStock) {
      const sh = parseFloat(shares)
      const bp = parseFloat(buyPrice)
      if (isNaN(sh) || sh <= 0) { setError('Enter the number of shares held'); return }
      if (isNaN(bp) || bp <= 0) { setError('Enter the buy price per share'); return }
      setError('')
      setAdding(true)

      const id = uid()
      const amountInvested = sh * bp
      // Insert immediately with cost as a placeholder so the row appears
      // right away, then fetch the live price and correct currentValue.
      const inv: Investment = {
        id,
        name: name.trim(),
        type,
        amountInvested,
        currentValue: amountInvested,
        symbol: symbol!,
        sharesHeld: sh,
        buyPrice: bp,
        priceOverride: null,
        lastPriceUpdate: null,
      }
      dispatch({ type: 'ADD_INVESTMENT', payload: inv })
      resetForm()
      setAdding(false)
      await refreshPrice(inv)
      return
    }

    const c = parseFloat(cost)
    if (isNaN(c) || c <= 0) { setError('Enter a valid invested amount'); return }
    const v = parseFloat(current)
    if (isNaN(v) || v <= 0) { setError('Enter a valid current value'); return }
    setError('')
    const inv: Investment = {
      id: uid(),
      name: name.trim(),
      type,
      amountInvested: c,
      currentValue: v,
    }
    dispatch({ type: 'ADD_INVESTMENT', payload: inv })
    resetForm()
  }

  async function refreshPrice(inv: Investment) {
    if (!inv.symbol || !inv.sharesHeld) return
    setPriceStatus(s => ({ ...s, [inv.id]: 'loading' }))
    const result = await fetchStockPrice(inv.symbol)
    if (result.source === 'failed') {
      setPriceStatus(s => ({ ...s, [inv.id]: 'failed' }))
      return
    }
    const updated: Investment = {
      ...inv,
      currentValue: inv.sharesHeld * (inv.priceOverride ?? result.price),
      lastPriceUpdate: result.fetchedAt,
    }
    dispatch({ type: 'UPDATE_INVESTMENT', payload: updated })
    setPriceStatus(s => ({ ...s, [inv.id]: result.source }))
  }

  async function refreshAllPrices() {
    for (const inv of state.investments) {
      if (inv.symbol && inv.sharesHeld) {
        await refreshPrice(inv)
      }
    }
  }

  const trackedStocks = state.investments.filter(i => i.symbol && i.sharesHeld)
  const priceBadge = (id: string) => {
    const s = priceStatus[id]
    if (s === 'loading') return (
      <span className="flex items-center gap-1 text-[10px] text-ink-muted">
        <RefreshCw className="w-3 h-3 animate-spin" /> fetching…
      </span>
    )
    if (s === 'live') return (
      <span className="flex items-center gap-1 text-[10px] text-success">
        <CheckCircle className="w-3 h-3" /> live
      </span>
    )
    if (s === 'eod') return (
      <span className="flex items-center gap-1 text-[10px] text-warning">
        <AlertCircle className="w-3 h-3" /> last close
      </span>
    )
    if (s === 'failed') return (
      <span className="flex items-center gap-1 text-[10px] text-danger">
        <AlertCircle className="w-3 h-3" /> fetch failed
      </span>
    )
    return null
  }

  return (
    <div>
      <PageHeader title="Investments" subtitle="Monitor your portfolio performance" />

      <NetWorthContribution label="Investments" amount={totalCurrent} netWorth={overallNetWorth} />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard label="Portfolio value" value={fmtCompact(totalCurrent)} />
        <MetricCard label="Total invested" value={fmtCompact(totalCost)} />
        <MetricCard
          label="Total gain / loss"
          value={`${totalGain >= 0 ? '+' : ''}${fmtCompact(totalGain)}`}
          sub={`${overallReturn}% overall return`}
          variant={totalGain >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Add form */}
      <div className="card mb-6">
        <h2 className="text-sm font-medium text-ink-primary mb-4">Add investment</h2>
        {error && <p className="text-xs text-danger mb-3 bg-red-50 dark:bg-danger/10 px-3 py-2 rounded">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {type === 'Stocks' ? (
            <StockSymbolSelect
              value={name}
              onChange={v => { setName(v); setSymbol(null) }}
              onSelect={selectStock}
              placeholder="Search PSX symbol or company (e.g. LUCK, Engro)"
            />
          ) : (
            <input
              className="input"
              placeholder="Investment name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          )}
          <select
            className="select w-full"
            value={type}
            onChange={e => { setType(e.target.value as InvestmentType); setSymbol(null); setName('') }}
          >
            {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex gap-3 flex-wrap">
          {symbol ? (
            <>
              <input
                className="input flex-1 font-mono"
                type="number"
                placeholder="Buy price per share (PKR)"
                value={buyPrice}
                onChange={e => setBuyPrice(e.target.value)}
              />
              <input
                className="input flex-1 font-mono"
                type="number"
                placeholder="Shares held"
                value={shares}
                onChange={e => setShares(e.target.value)}
              />
            </>
          ) : (
            <>
              <input
                className="input flex-1 font-mono"
                type="number"
                placeholder="Amount invested (PKR)"
                value={cost}
                onChange={e => setCost(e.target.value)}
              />
              <input
                className="input flex-1 font-mono"
                type="number"
                placeholder="Current value (PKR)"
                value={current}
                onChange={e => setCurrent(e.target.value)}
              />
            </>
          )}
          <button className="btn-primary" onClick={add} disabled={adding}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        {symbol && buyPrice && shares && !isNaN(parseFloat(buyPrice)) && !isNaN(parseFloat(shares)) && (
          <p className="text-[11px] text-ink-muted mt-3">
            {symbol} — total invested {fmt(parseFloat(buyPrice) * parseFloat(shares))}. Current value will be fetched
            from PSX automatically (live price × shares held) once added.
          </p>
        )}
        {symbol && !(buyPrice && shares) && (
          <p className="text-[11px] text-ink-muted mt-3">
            {symbol} — enter your buy price per share and shares held; total invested is calculated automatically.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Portfolio table */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-primary">Holdings</h2>
            {trackedStocks.length > 0 && (
              <button className="btn-ghost text-xs h-8" onClick={refreshAllPrices}>
                <RefreshCw className="w-3.5 h-3.5" /> Refresh prices
              </button>
            )}
          </div>
          {state.investments.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">No investments added yet</p>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_80px_100px_100px_90px_36px] gap-2 px-2 pb-2 border-b border-gray-100 dark:border-white/10">
                {['Name', 'Type', 'Invested', 'Current', 'Gain/Loss', ''].map(h => (
                  <p key={h} className="section-label">{h}</p>
                ))}
              </div>
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {state.investments.map(inv => {
                  const gain = inv.currentValue - inv.amountInvested
                  const gp = gainPct(inv.amountInvested, inv.currentValue)
                  const isTracked = Boolean(inv.symbol && inv.sharesHeld)
                  return (
                    <div
                      key={inv.id}
                      className="grid grid-cols-[1fr_80px_100px_100px_90px_36px] gap-2 items-center px-2 py-3 hover:bg-surface-0 rounded-lg transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-primary truncate">{inv.name}</p>
                        {isTracked && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-[11px] text-ink-muted truncate">
                              {inv.symbol} · {inv.sharesHeld} shares{inv.buyPrice ? ` @ ${fmt(inv.buyPrice)}` : ''}
                            </p>
                            <span className="flex-shrink-0">{priceBadge(inv.id)}</span>
                          </div>
                        )}
                      </div>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-block"
                        style={{
                          background: INVESTMENT_TYPE_COLORS[inv.type] + '18',
                          color: INVESTMENT_TYPE_COLORS[inv.type],
                        }}
                      >
                        {inv.type}
                      </span>
                      <span className="text-xs font-mono text-ink-muted">{fmt(inv.amountInvested)}</span>
                      <span className="text-sm font-mono text-ink-primary">{fmt(inv.currentValue)}</span>
                      <div className="flex items-center gap-1">
                        {gain >= 0
                          ? <TrendingUp className="w-3 h-3 text-success flex-shrink-0" />
                          : <TrendingDown className="w-3 h-3 text-danger flex-shrink-0" />
                        }
                        <span className={`text-xs font-mono font-medium ${gain >= 0 ? 'text-success' : 'text-danger'}`}>
                          {gp}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isTracked && (
                          <button
                            className="btn-ghost h-7 px-1.5"
                            onClick={() => refreshPrice(inv)}
                            title="Refresh price"
                            aria-label="Refresh price"
                          >
                            <RefreshCw className={`w-3 h-3 ${priceStatus[inv.id] === 'loading' ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        <button
                          className="btn-danger"
                          onClick={() => setDeleteTarget(inv)}
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="card">
          <h2 className="text-sm font-medium text-ink-primary mb-4">Allocation</h2>
          {byType.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-ink-muted">
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={byType}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {byType.map(entry => (
                    <Cell key={entry.name} fill={INVESTMENT_TYPE_COLORS[entry.name as InvestmentType] ?? '#888'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [fmt(val), '']}
                  contentStyle={{
                    fontSize: 12,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: 8,
                    background: chartColors.tooltipBg,
                    color: chartColors.mutedText,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: chartColors.mutedText }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This will permanently remove this investment from your portfolio. This can't be undone."
        onConfirm={() => {
          if (deleteTarget) dispatch({ type: 'DELETE_INVESTMENT', payload: deleteTarget.id })
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
