'use client'

import { useCallback, useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import {
  Investment, INVESTMENT_TYPES, InvestmentType, INVESTMENT_TYPE_COLORS, PsxSymbol,
  MutualFund, MUTUAL_FUND_TYPES, MutualFundType, MUTUAL_FUND_TYPE_COLORS,
} from '@/types'
import { fmt, fmtCompact, gainPct, uid } from '@/lib/utils'
import { computeNetWorth } from '@/lib/networth'
import { fetchStockPrice } from '@/lib/fetchStockPrice'
import { fetchNav, fetchMufapFundsData, clearNavCache, MufapFund } from '@/lib/fetchNav'
import { PSX_INDICES } from '@/lib/psxIndices'
import { useChartColors } from '@/lib/theme'
import MetricCard from '@/components/MetricCard'
import PageHeader from '@/components/PageHeader'
import NetWorthContribution from '@/components/NetWorthContribution'
import StockSymbolSelect from '@/components/StockSymbolSelect'
import MutualFundSelect from '@/components/MutualFundSelect'
import StockDetailModal from '@/components/StockDetailModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import MarketChart from '@/components/MarketChart'
import IndexTicker from '@/components/IndexTicker'
import {
  Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, CheckCircle, AlertCircle,
  Edit2, X, Save, Search,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import clsx from 'clsx'

type PriceStatus = Record<string, 'idle' | 'loading' | 'live' | 'eod' | 'failed'>
type NavStatus = Record<string, 'idle' | 'loading' | 'live' | 'override' | 'failed'>

type Tab = InvestmentType | 'Mutual Funds' | 'Markets'
const TABS: Tab[] = [...INVESTMENT_TYPES, 'Mutual Funds', 'Markets']

function effectiveNav(f: MutualFund): number {
  return f.navOverride !== null && f.navOverride > 0 ? f.navOverride : f.currentNav
}
function fundCurrentValue(f: MutualFund): number {
  return f.unitsHeld * effectiveNav(f)
}
function fundCostBasis(f: MutualFund): number {
  return f.unitsHeld * f.buyNav
}

export default function InvestmentsPage() {
  const { state, dispatch } = useStore()
  const chartColors = useChartColors()
  const [tab, setTab] = useState<Tab>('Stocks')

  // ---- Stocks/Crypto/Bonds/Other add-form state ----
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState<string | null>(null)
  const [cost, setCost] = useState('')
  const [current, setCurrent] = useState('')
  const [shares, setShares] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [invError, setInvError] = useState('')
  const [adding, setAdding] = useState(false)
  const [priceStatus, setPriceStatus] = useState<PriceStatus>({})
  const [deleteInvTarget, setDeleteInvTarget] = useState<Investment | null>(null)
  const [detailStock, setDetailStock] = useState<Investment | null>(null)

  // ---- Mutual fund state ----
  const [fundName, setFundName] = useState('')
  const [fundType, setFundType] = useState<MutualFundType>('Money Market')
  const [units, setUnits] = useState('')
  const [buyNav, setBuyNav] = useState('')
  const [manualNav, setManualNav] = useState('')
  const [notes, setNotes] = useState('')
  const [addFundError, setAddFundError] = useState('')
  const [navStatus, setNavStatus] = useState<NavStatus>({})
  const [editId, setEditId] = useState<string | null>(null)
  const [editUnits, setEditUnits] = useState('')
  const [editBuyNav, setEditBuyNav] = useState('')
  const [editOverride, setEditOverride] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [deleteFundTarget, setDeleteFundTarget] = useState<MutualFund | null>(null)
  const [navUpdatedAt, setNavUpdatedAt] = useState<string | null>(null)

  // ---- Markets tab state ----
  const [OverallKSE100, OverallKSE30, ...otherIndices] = PSX_INDICES
  const [selectedIndex, setSelectedIndex] = useState(otherIndices[0])
  const [stockQuery, setStockQuery] = useState('')
  const [selectedMarketStock, setSelectedMarketStock] = useState<PsxSymbol | null>(null)

  const overallNetWorth = computeNetWorth(state).netWorth

  // ---- Investments (stocks/crypto/bonds/other) derived data ----
  const totalCost = state.investments.reduce((s, i) => s + i.amountInvested, 0)
  const totalCurrent = state.investments.reduce((s, i) => s + i.currentValue, 0)
  const totalGain = totalCurrent - totalCost

  const byType = INVESTMENT_TYPES.map(t => ({
    name: t,
    value: state.investments.filter(i => i.type === t).reduce((s, i) => s + i.currentValue, 0),
  })).filter(d => d.value > 0)

  const trackedStocks = state.investments.filter(i => i.symbol && i.sharesHeld)

  const refreshPrice = useCallback(async (inv: Investment) => {
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
  }, [dispatch])

  const refreshAllPrices = useCallback(async () => {
    for (const inv of state.investments) {
      if (inv.symbol && inv.sharesHeld) await refreshPrice(inv)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.investments, refreshPrice])

  // ---- Mutual fund derived data ----
  const funds = state.mutualFunds
  const totalFundCurrent = funds.reduce((s, f) => s + fundCurrentValue(f), 0)
  const totalFundCost = funds.reduce((s, f) => s + fundCostBasis(f), 0)
  const totalFundGain = totalFundCurrent - totalFundCost
  const totalFundGainPct = gainPct(totalFundCost, totalFundCurrent, 2)
  const totalRealizedGains = funds.reduce((s, f) => s + f.realizedGains, 0)
  const fundsByType = MUTUAL_FUND_TYPES.map(t => ({
    name: t,
    value: funds.filter(f => f.fundType === t).reduce((s, f) => s + fundCurrentValue(f), 0),
  })).filter(d => d.value > 0)

  const fetchNavForFund = useCallback(async (fund: MutualFund) => {
    setNavStatus(s => ({ ...s, [fund.id]: 'loading' }))
    const result = await fetchNav(fund.name, fund.navOverride)
    const updated: MutualFund = {
      ...fund,
      currentNav: result.source !== 'failed' ? result.nav : fund.currentNav,
      lastUpdated: result.source !== 'failed' ? result.fetchedAt : fund.lastUpdated,
    }
    dispatch({ type: 'UPDATE_MUTUAL_FUND', payload: updated })
    setNavStatus(s => ({ ...s, [fund.id]: result.source }))
  }, [dispatch])

  const refreshAllNavs = useCallback(async () => {
    for (const fund of funds) await fetchNavForFund(fund)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funds, fetchNavForFund])

  // Auto-refresh prices/NAVs as soon as the relevant tab is opened, instead
  // of requiring an explicit click — mirrors what a "live" portfolio should
  // feel like. Runs once per tab visit (not on every render).
  useEffect(() => {
    if (tab === 'Stocks' && trackedStocks.length > 0) {
      refreshAllPrices()
    }
    if (tab === 'Mutual Funds' && funds.length > 0) {
      clearNavCache()
      refreshAllNavs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Warm the MUFAP fund list as soon as the Mutual Funds tab (or its add
  // form) is likely to be used, so MutualFundSelect doesn't start empty, and
  // grab the daily snapshot's timestamp to show users how fresh it is.
  useEffect(() => {
    if (tab === 'Mutual Funds') {
      fetchMufapFundsData().then(d => setNavUpdatedAt(d.updatedAt))
    }
  }, [tab])

  function resetInvForm() {
    setName(''); setSymbol(null); setCost(''); setCurrent(''); setShares(''); setBuyPrice('')
  }

  function selectStock(s: PsxSymbol) {
    setSymbol(s.symbol)
    setName(s.name)
  }

  const isTrackedStock = tab === 'Stocks' && symbol !== null

  async function addInvestment() {
    if (!name.trim()) { setInvError('Name is required'); return }
    const type = tab as InvestmentType

    if (isTrackedStock) {
      const sh = parseFloat(shares)
      const bp = parseFloat(buyPrice)
      if (isNaN(sh) || sh <= 0) { setInvError('Enter the number of shares held'); return }
      if (isNaN(bp) || bp <= 0) { setInvError('Enter the buy price per share'); return }
      setInvError('')
      setAdding(true)

      const id = uid()
      const amountInvested = sh * bp
      const inv: Investment = {
        id, name: name.trim(), type, amountInvested, currentValue: amountInvested,
        symbol: symbol!, sharesHeld: sh, buyPrice: bp, priceOverride: null, lastPriceUpdate: null,
      }
      dispatch({ type: 'ADD_INVESTMENT', payload: inv })
      resetInvForm()
      setAdding(false)
      await refreshPrice(inv)
      return
    }

    const c = parseFloat(cost)
    if (isNaN(c) || c <= 0) { setInvError('Enter a valid invested amount'); return }
    const v = parseFloat(current)
    if (isNaN(v) || v <= 0) { setInvError('Enter a valid current value'); return }
    setInvError('')
    dispatch({ type: 'ADD_INVESTMENT', payload: { id: uid(), name: name.trim(), type, amountInvested: c, currentValue: v } })
    resetInvForm()
  }

  const priceBadge = (id: string) => {
    const s = priceStatus[id]
    if (s === 'loading') return (
      <span className="flex items-center gap-1 text-[10px] text-ink-muted flex-shrink-0">
        <RefreshCw className="w-3 h-3 animate-spin" /> fetching…
      </span>
    )
    if (s === 'live') return (
      <span className="flex items-center gap-1 text-[10px] text-success flex-shrink-0">
        <CheckCircle className="w-3 h-3" /> live
      </span>
    )
    if (s === 'eod') return (
      <span className="flex items-center gap-1 text-[10px] text-ink-muted flex-shrink-0">
        <AlertCircle className="w-3 h-3" /> closed
      </span>
    )
    if (s === 'failed') return (
      <span className="flex items-center gap-1 text-[10px] text-danger flex-shrink-0">
        <AlertCircle className="w-3 h-3" /> fetch failed
      </span>
    )
    return null
  }

  function addFund() {
    if (!fundName.trim()) { setAddFundError('Fund name is required'); return }
    const u = parseFloat(units)
    const b = parseFloat(buyNav)
    if (isNaN(u) || u < 0) { setAddFundError('Enter valid units held'); return }
    if (isNaN(b) || b <= 0) { setAddFundError('Enter a valid buy NAV (PKR per unit)'); return }
    const mn = parseFloat(manualNav)
    setAddFundError('')
    const fund: MutualFund = {
      id: uid(), name: fundName.trim(), fundType, unitsHeld: u, buyNav: b,
      currentNav: isNaN(mn) ? b : mn, navOverride: isNaN(mn) || mn <= 0 ? null : mn,
      lastUpdated: null, realizedGains: 0, notes: notes.trim(),
    }
    dispatch({ type: 'ADD_MUTUAL_FUND', payload: fund })
    setFundName(''); setUnits(''); setBuyNav(''); setManualNav(''); setNotes('')
  }

  function selectFund(f: MufapFund) {
    setFundName(f.name)
    if (!buyNav) setBuyNav(String(f.nav))
  }

  function startEdit(f: MutualFund) {
    setEditId(f.id)
    setEditUnits(String(f.unitsHeld))
    setEditBuyNav(String(f.buyNav))
    setEditOverride(f.navOverride !== null ? String(f.navOverride) : '')
    setEditNotes(f.notes)
  }

  function saveEdit(f: MutualFund) {
    const u = parseFloat(editUnits)
    const b = parseFloat(editBuyNav)
    const ov = parseFloat(editOverride)
    dispatch({
      type: 'UPDATE_MUTUAL_FUND',
      payload: {
        ...f,
        unitsHeld: isNaN(u) ? f.unitsHeld : u,
        buyNav: isNaN(b) ? f.buyNav : b,
        navOverride: !isNaN(ov) && ov > 0 ? ov : null,
        currentNav: !isNaN(ov) && ov > 0 ? ov : f.currentNav,
        notes: editNotes.trim(),
      },
    })
    setEditId(null)
  }

  const navSourceBadge = (id: string) => {
    const s = navStatus[id]
    if (s === 'loading') return <span className="flex items-center gap-1 text-[10px] text-ink-muted"><RefreshCw className="w-3 h-3 animate-spin" /> fetching…</span>
    if (s === 'live') return <span className="flex items-center gap-1 text-[10px] text-success"><CheckCircle className="w-3 h-3" /> live</span>
    if (s === 'override') return <span className="flex items-center gap-1 text-[10px] text-warning"><AlertCircle className="w-3 h-3" /> manual</span>
    if (s === 'failed') return <span className="flex items-center gap-1 text-[10px] text-danger"><AlertCircle className="w-3 h-3" /> fetch failed</span>
    return null
  }

  const tabInvestments = INVESTMENT_TYPES.includes(tab as InvestmentType)
    ? state.investments.filter(i => i.type === tab)
    : []

  return (
    <div>
      <PageHeader title="Investments" subtitle="Stocks, mutual funds, and live PSX market data — all in one place" />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <NetWorthContribution label="Investments" amount={totalCurrent} netWorth={overallNetWorth} />
        <NetWorthContribution label="Mutual funds" amount={totalFundCurrent} netWorth={overallNetWorth} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard label="Combined value" value={fmtCompact(totalCurrent + totalFundCurrent)} />
        <MetricCard label="Total invested" value={fmtCompact(totalCost + totalFundCost)} />
        <MetricCard
          label="Total gain / loss"
          value={`${(totalGain + totalFundGain) >= 0 ? '+' : ''}${fmtCompact(totalGain + totalFundGain)}`}
          sub={`${gainPct(totalCost + totalFundCost, totalCurrent + totalFundCurrent)}% overall return`}
          variant={(totalGain + totalFundGain) >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="flex rounded-lg border border-gray-200 dark:border-white/10 p-0.5 w-fit mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-3.5 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap',
              tab === t ? 'bg-brand-600 text-white' : 'text-ink-secondary hover:bg-surface-0'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ---------------- Stocks / Crypto / Bonds / Other ---------------- */}
      {(tab === 'Stocks' || tab === 'Crypto' || tab === 'Bonds' || tab === 'Other') && (
        <>
          <div className="card mb-6">
            <h2 className="text-sm font-medium text-ink-primary mb-4">Add {tab.toLowerCase()}</h2>
            {invError && <p className="text-xs text-danger mb-3 bg-red-50 dark:bg-danger/10 px-3 py-2 rounded">{invError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {tab === 'Stocks' ? (
                <StockSymbolSelect
                  value={name}
                  onChange={v => { setName(v); setSymbol(null) }}
                  onSelect={selectStock}
                  placeholder="Search PSX symbol or company (e.g. LUCK, Engro)"
                />
              ) : (
                <input
                  className="input"
                  placeholder={`${tab} name`}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              )}
              <div className="flex gap-3">
                {symbol ? (
                  <>
                    <input className="input flex-1 font-mono" type="number" placeholder="Buy price/share (PKR)" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} />
                    <input className="input flex-1 font-mono" type="number" placeholder="Shares held" value={shares} onChange={e => setShares(e.target.value)} />
                  </>
                ) : (
                  <>
                    <input className="input flex-1 font-mono" type="number" placeholder="Amount invested (PKR)" value={cost} onChange={e => setCost(e.target.value)} />
                    <input className="input flex-1 font-mono" type="number" placeholder="Current value (PKR)" value={current} onChange={e => setCurrent(e.target.value)} />
                  </>
                )}
              </div>
            </div>
            <button className="btn-primary" onClick={addInvestment} disabled={adding}>
              <Plus className="w-4 h-4" /> Add {tab.toLowerCase()}
            </button>
            {symbol && buyPrice && shares && !isNaN(parseFloat(buyPrice)) && !isNaN(parseFloat(shares)) && (
              <p className="text-[11px] text-ink-muted mt-3">
                {symbol} — total invested {fmt(parseFloat(buyPrice) * parseFloat(shares))}. Current value is kept in
                sync with the live PSX price × shares held.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="card lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-ink-primary">Holdings</h2>
                {tab === 'Stocks' && trackedStocks.length > 0 && (
                  <button className="btn-ghost text-xs h-8" onClick={refreshAllPrices}>
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh prices
                  </button>
                )}
              </div>
              {tabInvestments.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-8">No {tab.toLowerCase()} added yet</p>
              ) : (
                <div>
                  <div className="grid grid-cols-[1fr_100px_100px_90px_36px] gap-2 px-2 pb-2 border-b border-gray-100 dark:border-white/10">
                    {['Name', 'Invested', 'Current', 'Gain/Loss', ''].map(h => (
                      <p key={h} className="section-label">{h}</p>
                    ))}
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-white/5">
                    {tabInvestments.map(inv => {
                      const gain = inv.currentValue - inv.amountInvested
                      const gp = gainPct(inv.amountInvested, inv.currentValue)
                      const isTracked = Boolean(inv.symbol && inv.sharesHeld)
                      return (
                        <div
                          key={inv.id}
                          className={clsx(
                            'grid grid-cols-[1fr_100px_100px_90px_36px] gap-2 items-center px-2 py-3 rounded-lg transition-colors',
                            isTracked ? 'hover:bg-surface-0 cursor-pointer' : 'hover:bg-surface-0'
                          )}
                          onClick={() => isTracked && setDetailStock(inv)}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink-primary truncate">{inv.name}</p>
                            {isTracked && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="text-[11px] text-ink-muted truncate min-w-0">
                                  {inv.symbol} · {inv.sharesHeld} shares{inv.buyPrice ? ` @ ${fmt(inv.buyPrice)}` : ''}
                                </p>
                                {priceBadge(inv.id)}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-mono text-ink-muted">{fmt(inv.amountInvested)}</span>
                          <span className="text-sm font-mono text-ink-primary">{fmt(inv.currentValue)}</span>
                          <div className="flex items-center gap-1">
                            {gain >= 0
                              ? <TrendingUp className="w-3 h-3 text-success flex-shrink-0" />
                              : <TrendingDown className="w-3 h-3 text-danger flex-shrink-0" />}
                            <span className={`text-xs font-mono font-medium ${gain >= 0 ? 'text-success' : 'text-danger'}`}>{gp}%</span>
                          </div>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {isTracked && (
                              <button className="btn-ghost h-7 px-1.5" onClick={() => refreshPrice(inv)} title="Refresh price" aria-label="Refresh price">
                                <RefreshCw className={`w-3 h-3 ${priceStatus[inv.id] === 'loading' ? 'animate-spin' : ''}`} />
                              </button>
                            )}
                            <button className="btn-danger" onClick={() => setDeleteInvTarget(inv)} aria-label="Delete">
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

            <div className="card">
              <h2 className="text-sm font-medium text-ink-primary mb-4">Allocation</h2>
              {byType.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-sm text-ink-muted">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={byType} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {byType.map(entry => (
                        <Cell key={entry.name} fill={INVESTMENT_TYPE_COLORS[entry.name as InvestmentType]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [fmt(val), '']}
                      contentStyle={{ fontSize: 12, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, background: chartColors.tooltipBg, color: chartColors.mutedText }}
                    />
                    <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 11, color: chartColors.mutedText }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}

      {/* ---------------- Mutual Funds ---------------- */}
      {tab === 'Mutual Funds' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Portfolio value" value={fmtCompact(totalFundCurrent)} />
            <MetricCard label="Cost basis" value={fmtCompact(totalFundCost)} />
            <MetricCard
              label="Unrealized gain"
              value={`${totalFundGain >= 0 ? '+' : ''}${fmtCompact(totalFundGain)}`}
              sub={`${totalFundGainPct}% return`}
              variant={totalFundGain >= 0 ? 'positive' : 'negative'}
            />
            <MetricCard label="Realized gains" value={fmtCompact(totalRealizedGains)} sub="from sold units" variant={totalRealizedGains >= 0 ? 'positive' : 'default'} />
          </div>

          <p className="text-[11px] text-ink-muted -mt-3 mb-4">
            NAVs sourced from MUFAP, refreshed once daily (not on weekends).{' '}
            {navUpdatedAt
              ? `Last updated ${new Date(navUpdatedAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}.`
              : 'Loading last-updated time…'}
          </p>

          <div className="card mb-6">
            <h2 className="text-sm font-medium text-ink-primary mb-4">Add mutual fund</h2>
            {addFundError && <p className="text-xs text-danger mb-3 bg-red-50 dark:bg-danger/10 px-3 py-2 rounded">{addFundError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <MutualFundSelect value={fundName} onChange={setFundName} onSelect={selectFund} />
              <select className="select w-full" value={fundType} onChange={e => setFundType(e.target.value as MutualFundType)}>
                {MUTUAL_FUND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <input className="input font-mono" type="number" placeholder="Units held" value={units} onChange={e => setUnits(e.target.value)} />
              <input className="input font-mono" type="number" placeholder="Buy NAV (PKR/unit)" value={buyNav} onChange={e => setBuyNav(e.target.value)} />
              <input className="input font-mono" type="number" placeholder="Current NAV override (optional)" value={manualNav} onChange={e => setManualNav(e.target.value)} />
            </div>
            <div className="flex gap-3 flex-wrap">
              <input className="input flex-1" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
              <button className="btn-primary" onClick={addFund}>
                <Plus className="w-4 h-4" /> Add fund
              </button>
            </div>
            <p className="text-[11px] text-ink-muted mt-3">
              Search picks the fund's real MUFAP name and current NAV automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="card lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-ink-primary">Holdings <span className="text-ink-muted font-normal">({funds.length})</span></h2>
                {funds.length > 0 && (
                  <button className="btn-ghost text-xs h-8" onClick={() => { clearNavCache(); refreshAllNavs() }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh NAVs
                  </button>
                )}
              </div>

              {funds.length === 0 ? (
                <p className="text-sm text-ink-muted text-center py-10">No mutual funds added yet</p>
              ) : (
                <div className="space-y-3">
                  {funds.map(f => {
                    const cv = fundCurrentValue(f)
                    const cb = fundCostBasis(f)
                    const gain = cv - cb
                    const gp = gainPct(cb, cv, 2)
                    const isEditing = editId === f.id
                    const nav = effectiveNav(f)

                    return (
                      <div key={f.id} className="border border-gray-100 dark:border-white/10 rounded-lg p-4 hover:border-gray-200 dark:hover:border-white/20 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-ink-primary truncate">{f.name}</p>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: MUTUAL_FUND_TYPE_COLORS[f.fundType] + '18', color: MUTUAL_FUND_TYPE_COLORS[f.fundType] }}>
                                {f.fundType}
                              </span>
                              {navSourceBadge(f.id)}
                            </div>
                            {f.notes && <p className="text-[11px] text-ink-muted mt-0.5 truncate">{f.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button className="btn-ghost h-7 px-2 text-xs" onClick={() => fetchNavForFund(f)} title="Fetch NAV">
                              <RefreshCw className={`w-3 h-3 ${navStatus[f.id] === 'loading' ? 'animate-spin' : ''}`} />
                            </button>
                            {isEditing ? (
                              <>
                                <button className="btn-primary h-7 px-2 text-xs" onClick={() => saveEdit(f)}><Save className="w-3 h-3" /></button>
                                <button className="btn-ghost h-7 px-2 text-xs" onClick={() => setEditId(null)}><X className="w-3 h-3" /></button>
                              </>
                            ) : (
                              <>
                                <button className="btn-ghost h-7 px-2 text-xs" onClick={() => startEdit(f)}><Edit2 className="w-3 h-3" /></button>
                                <button className="btn-danger h-7" onClick={() => setDeleteFundTarget(f)}><Trash2 className="w-3.5 h-3.5" /></button>
                              </>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 p-3 bg-surface-0 rounded-lg">
                            <div><p className="section-label mb-1">Units held</p><input className="input h-8 text-xs font-mono" type="number" value={editUnits} onChange={e => setEditUnits(e.target.value)} /></div>
                            <div><p className="section-label mb-1">Buy NAV (PKR)</p><input className="input h-8 text-xs font-mono" type="number" value={editBuyNav} onChange={e => setEditBuyNav(e.target.value)} /></div>
                            <div><p className="section-label mb-1">NAV override (PKR)</p><input className="input h-8 text-xs font-mono" type="number" placeholder="0 = use live" value={editOverride} onChange={e => setEditOverride(e.target.value)} /></div>
                            <div><p className="section-label mb-1">Notes</p><input className="input h-8 text-xs" value={editNotes} onChange={e => setEditNotes(e.target.value)} /></div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="bg-surface-0 rounded-lg p-2">
                            <p className="section-label mb-1">Units</p>
                            <p className="text-sm font-mono font-medium text-ink-primary">{f.unitsHeld.toLocaleString('en-PK', { maximumFractionDigits: 4 })}</p>
                          </div>
                          <div className="bg-surface-0 rounded-lg p-2">
                            <p className="section-label mb-1">NAV (current)</p>
                            <p className="text-sm font-mono font-medium text-ink-primary">Rs {nav.toLocaleString('en-PK', { maximumFractionDigits: 4 })}</p>
                            {f.navOverride === null && f.lastUpdated && (
                              <p className="text-[10px] text-ink-muted mt-0.5">{new Date(f.lastUpdated).toLocaleDateString('en-PK')}</p>
                            )}
                          </div>
                          <div className="bg-surface-0 rounded-lg p-2">
                            <p className="section-label mb-1">Current value</p>
                            <p className="text-sm font-mono font-medium text-ink-primary">{fmt(cv)}</p>
                            <p className="text-[10px] text-ink-muted">cost: {fmt(cb)}</p>
                          </div>
                          <div className="bg-surface-0 rounded-lg p-2">
                            <p className="section-label mb-1">Unrealized G/L</p>
                            <div className="flex items-center justify-center gap-1">
                              {gain >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : <TrendingDown className="w-3.5 h-3.5 text-danger" />}
                              <p className={`text-sm font-mono font-medium ${gain >= 0 ? 'text-success' : 'text-danger'}`}>{gp}%</p>
                            </div>
                            <p className={`text-[10px] font-mono mt-0.5 ${gain >= 0 ? 'text-success' : 'text-danger'}`}>{gain >= 0 ? '+' : ''}{fmt(gain)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card">
                <h2 className="text-sm font-medium text-ink-primary mb-4">Allocation by type</h2>
                {fundsByType.length === 0 ? (
                  <div className="h-36 flex items-center justify-center text-sm text-ink-muted">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={fundsByType} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {fundsByType.map(entry => (
                          <Cell key={entry.name} fill={MUTUAL_FUND_TYPE_COLORS[entry.name as MutualFundType] ?? '#888'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => [fmt(val), '']} contentStyle={{ fontSize: 12, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, background: chartColors.tooltipBg, color: chartColors.mutedText }} />
                      <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: chartColors.mutedText }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card">
                <h2 className="text-sm font-medium text-ink-primary mb-3">Summary</h2>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Funds tracked', value: String(funds.length) },
                    { label: 'Total units', value: funds.reduce((s, f) => s + f.unitsHeld, 0).toLocaleString('en-PK', { maximumFractionDigits: 2 }) },
                    { label: 'Total invested', value: fmt(totalFundCost) },
                    { label: 'Current value', value: fmt(totalFundCurrent) },
                    { label: 'Unrealized gain', value: `${totalFundGain >= 0 ? '+' : ''}${fmt(totalFundGain)}`, color: totalFundGain >= 0 ? 'text-success' : 'text-danger' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-white/5">
                      <span className="text-ink-muted text-xs">{row.label}</span>
                      <span className={`text-xs font-mono font-medium ${row.color ?? 'text-ink-primary'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ---------------- Markets ---------------- */}
      {tab === 'Markets' && (
        <>
          <p className="text-[11px] text-ink-muted -mt-2 mb-6">
            Sourced from PSX's own data portal — during trading hours prices update every minute,
            outside market hours the last close is shown.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card"><MarketChart symbol={OverallKSE100.code} label={OverallKSE100.label} unit="index" /></div>
            <div className="card"><MarketChart symbol={OverallKSE30.code} label={OverallKSE30.label} unit="index" /></div>
          </div>

          <div className="mb-6">
            <p className="section-label mb-2.5">Other indices</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {otherIndices.map(idx => (
                <IndexTicker key={idx.code} code={idx.code} label={idx.label} active={selectedIndex?.code === idx.code} onClick={() => setSelectedIndex(idx)} />
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
                onSelect={s => { setSelectedMarketStock(s); setStockQuery(s.name) }}
                placeholder="Search PSX symbol or company (e.g. LUCK, Engro)"
              />
            </div>
            {selectedMarketStock ? (
              <MarketChart key={selectedMarketStock.symbol} symbol={selectedMarketStock.symbol} label={`${selectedMarketStock.symbol} — ${selectedMarketStock.name}`} unit="PKR" />
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-ink-muted">Search for a stock above to see its price chart</div>
            )}
          </div>
        </>
      )}

      <StockDetailModal investment={detailStock} onClose={() => setDetailStock(null)} />

      <ConfirmDialog
        open={deleteInvTarget !== null}
        title={`Delete "${deleteInvTarget?.name}"?`}
        message="This will permanently remove this investment from your portfolio. This can't be undone."
        onConfirm={() => { if (deleteInvTarget) dispatch({ type: 'DELETE_INVESTMENT', payload: deleteInvTarget.id }); setDeleteInvTarget(null) }}
        onCancel={() => setDeleteInvTarget(null)}
      />
      <ConfirmDialog
        open={deleteFundTarget !== null}
        title={`Delete "${deleteFundTarget?.name}"?`}
        message="This will permanently remove this fund and its unit history from your portfolio. This can't be undone."
        onConfirm={() => { if (deleteFundTarget) dispatch({ type: 'DELETE_MUTUAL_FUND', payload: deleteFundTarget.id }); setDeleteFundTarget(null) }}
        onCancel={() => setDeleteFundTarget(null)}
      />
    </div>
  )
}
