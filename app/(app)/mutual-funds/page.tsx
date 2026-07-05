'use client'

import { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { MutualFund, MUTUAL_FUND_TYPES, MutualFundType } from '@/types'
import { fmt, fmtCompact, uid } from '@/lib/utils'
import { fetchNav, clearNavCache } from '@/lib/fetchNav'
import { computeNetWorth } from '@/lib/networth'
import MetricCard from '@/components/MetricCard'
import PageHeader from '@/components/PageHeader'
import NetWorthContribution from '@/components/NetWorthContribution'
import {
  Plus, Trash2, TrendingUp, TrendingDown,
  RefreshCw, AlertCircle, CheckCircle, Edit2, X, Save,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const TYPE_COLORS: Record<MutualFundType, string> = {
  'Money Market': '#2a78d6',
  'Equity':       '#1baf7a',
  'Income':       '#eda100',
  'Balanced':     '#4a3aa7',
  'Index':        '#eb6834',
  'Islamic':      '#e87ba4',
  'Other':        '#73726c',
}

type NavStatus = Record<string, 'idle' | 'loading' | 'live' | 'override' | 'failed'>

// Compute current value from units × nav (using override if set, else currentNav)
function effectiveNav(f: MutualFund): number {
  return f.navOverride !== null && f.navOverride > 0 ? f.navOverride : f.currentNav
}

function currentValue(f: MutualFund): number {
  return f.unitsHeld * effectiveNav(f)
}

function costBasis(f: MutualFund): number {
  return f.unitsHeld * f.buyNav
}

function gainPctStr(cost: number, current: number): string {
  if (cost === 0) return '0.0'
  return (((current - cost) / cost) * 100).toFixed(2)
}

export default function MutualFundsPage() {
  const { state, dispatch } = useStore()

  // Add form state
  const [name, setName] = useState('')
  const [fundType, setFundType] = useState<MutualFundType>('Money Market')
  const [units, setUnits] = useState('')
  const [buyNav, setBuyNav] = useState('')
  const [manualNav, setManualNav] = useState('')
  const [notes, setNotes] = useState('')
  const [addError, setAddError] = useState('')

  // NAV fetch status per fund id
  const [navStatus, setNavStatus] = useState<NavStatus>({})

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editUnits, setEditUnits] = useState('')
  const [editBuyNav, setEditBuyNav] = useState('')
  const [editOverride, setEditOverride] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Derived totals
  const funds = state.mutualFunds
  const totalCurrent = funds.reduce((s, f) => s + currentValue(f), 0)
  const totalCost = funds.reduce((s, f) => s + costBasis(f), 0)
  const totalGain = totalCurrent - totalCost
  const totalGainPct = totalCost > 0
    ? (((totalCurrent - totalCost) / totalCost) * 100).toFixed(2)
    : '0.00'
  const totalRealizedGains = funds.reduce((s, f) => s + f.realizedGains, 0)
  const overallNetWorth = computeNetWorth(state).netWorth

  // Pie data
  const byType = MUTUAL_FUND_TYPES.map(t => ({
    name: t,
    value: funds.filter(f => f.fundType === t).reduce((s, f) => s + currentValue(f), 0),
  })).filter(d => d.value > 0)

  function addFund() {
    if (!name.trim()) { setAddError('Fund name is required'); return }
    const u = parseFloat(units)
    const b = parseFloat(buyNav)
    if (isNaN(u) || u < 0) { setAddError('Enter valid units held'); return }
    if (isNaN(b) || b <= 0) { setAddError('Enter a valid buy NAV (PKR per unit)'); return }
    const mn = parseFloat(manualNav)
    setAddError('')
    const fund: MutualFund = {
      id: uid(),
      name: name.trim(),
      fundType,
      unitsHeld: u,
      buyNav: b,
      currentNav: isNaN(mn) ? b : mn,
      navOverride: isNaN(mn) || mn <= 0 ? null : mn,
      lastUpdated: null,
      realizedGains: 0,
      notes: notes.trim(),
    }
    dispatch({ type: 'ADD_MUTUAL_FUND', payload: fund })
    setName(''); setUnits(''); setBuyNav(''); setManualNav(''); setNotes('')
  }

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

  async function refreshAllNavs() {
    clearNavCache()
    for (const fund of funds) {
      await fetchNavForFund(fund)
    }
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
    const updated: MutualFund = {
      ...f,
      unitsHeld: isNaN(u) ? f.unitsHeld : u,
      buyNav: isNaN(b) ? f.buyNav : b,
      navOverride: !isNaN(ov) && ov > 0 ? ov : null,
      currentNav: !isNaN(ov) && ov > 0 ? ov : f.currentNav,
      notes: editNotes.trim(),
    }
    dispatch({ type: 'UPDATE_MUTUAL_FUND', payload: updated })
    setEditId(null)
  }

  const navSourceBadge = (id: string) => {
    const s = navStatus[id]
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
    if (s === 'override') return (
      <span className="flex items-center gap-1 text-[10px] text-warning">
        <AlertCircle className="w-3 h-3" /> manual
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
      <PageHeader title="Mutual Funds" subtitle="Pakistani mutual funds — units, NAV, and performance" />

      <NetWorthContribution label="Mutual funds" amount={totalCurrent} netWorth={overallNetWorth} />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Portfolio value" value={fmtCompact(totalCurrent)} />
        <MetricCard label="Cost basis" value={fmtCompact(totalCost)} />
        <MetricCard
          label="Unrealized gain"
          value={`${totalGain >= 0 ? '+' : ''}${fmtCompact(totalGain)}`}
          sub={`${totalGainPct}% return`}
          variant={totalGain >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Realized gains"
          value={fmtCompact(totalRealizedGains)}
          sub="from sold units"
          variant={totalRealizedGains >= 0 ? 'positive' : 'default'}
        />
      </div>

      {/* Add form */}
      <div className="card mb-6">
        <h2 className="text-sm font-medium text-ink-primary mb-4">Add mutual fund</h2>
        {addError && (
          <p className="text-xs text-danger mb-3 bg-red-50 px-3 py-2 rounded">{addError}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            className="input"
            placeholder="Fund name (e.g. MCB Cash Management Optimizer)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <select
            className="select w-full"
            value={fundType}
            onChange={e => setFundType(e.target.value as MutualFundType)}
          >
            {MUTUAL_FUND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <input
            className="input font-mono"
            type="number"
            placeholder="Units held"
            value={units}
            onChange={e => setUnits(e.target.value)}
          />
          <input
            className="input font-mono"
            type="number"
            placeholder="Buy NAV (PKR/unit)"
            value={buyNav}
            onChange={e => setBuyNav(e.target.value)}
          />
          <input
            className="input font-mono"
            type="number"
            placeholder="Current NAV override (optional)"
            value={manualNav}
            onChange={e => setManualNav(e.target.value)}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            className="input flex-1"
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <button className="btn-primary" onClick={addFund}>
            <Plus className="w-4 h-4" /> Add fund
          </button>
        </div>
        <p className="text-[11px] text-ink-muted mt-3">
          💡 Click <strong>Refresh NAVs</strong> after adding to try fetching live prices from MUFAP. Set a manual NAV override as fallback.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Fund list */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-primary">
              Holdings <span className="text-ink-muted font-normal">({funds.length})</span>
            </h2>
            {funds.length > 0 && (
              <button
                className="btn-ghost text-xs h-8"
                onClick={refreshAllNavs}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh NAVs
              </button>
            )}
          </div>

          {funds.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-10">
              No mutual funds added yet
            </p>
          ) : (
            <div className="space-y-3">
              {funds.map(f => {
                const cv = currentValue(f)
                const cb = costBasis(f)
                const gain = cv - cb
                const gp = gainPctStr(cb, cv)
                const isEditing = editId === f.id
                const nav = effectiveNav(f)

                return (
                  <div key={f.id} className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-ink-primary">{f.name}</p>
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: TYPE_COLORS[f.fundType] + '18', color: TYPE_COLORS[f.fundType] }}
                          >
                            {f.fundType}
                          </span>
                          {navSourceBadge(f.id)}
                        </div>
                        {f.notes && <p className="text-[11px] text-ink-muted mt-0.5">{f.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          className="btn-ghost h-7 px-2 text-xs"
                          onClick={() => fetchNavForFund(f)}
                          title="Fetch NAV"
                        >
                          <RefreshCw className={`w-3 h-3 ${navStatus[f.id] === 'loading' ? 'animate-spin' : ''}`} />
                        </button>
                        {isEditing ? (
                          <>
                            <button className="btn-primary h-7 px-2 text-xs" onClick={() => saveEdit(f)}>
                              <Save className="w-3 h-3" />
                            </button>
                            <button className="btn-ghost h-7 px-2 text-xs" onClick={() => setEditId(null)}>
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn-ghost h-7 px-2 text-xs" onClick={() => startEdit(f)}>
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              className="btn-danger h-7"
                              onClick={() => dispatch({ type: 'DELETE_MUTUAL_FUND', payload: f.id })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Edit fields */}
                    {isEditing && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 p-3 bg-surface-0 rounded-lg">
                        <div>
                          <p className="section-label mb-1">Units held</p>
                          <input className="input h-8 text-xs font-mono" type="number" value={editUnits} onChange={e => setEditUnits(e.target.value)} />
                        </div>
                        <div>
                          <p className="section-label mb-1">Buy NAV (PKR)</p>
                          <input className="input h-8 text-xs font-mono" type="number" value={editBuyNav} onChange={e => setEditBuyNav(e.target.value)} />
                        </div>
                        <div>
                          <p className="section-label mb-1">NAV override (PKR)</p>
                          <input className="input h-8 text-xs font-mono" type="number" placeholder="0 = use live" value={editOverride} onChange={e => setEditOverride(e.target.value)} />
                        </div>
                        <div>
                          <p className="section-label mb-1">Notes</p>
                          <input className="input h-8 text-xs" value={editNotes} onChange={e => setEditNotes(e.target.value)} />
                        </div>
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-surface-0 rounded-lg p-2">
                        <p className="section-label mb-1">Units</p>
                        <p className="text-sm font-mono font-medium text-ink-primary">
                          {f.unitsHeld.toLocaleString('en-PK', { maximumFractionDigits: 4 })}
                        </p>
                      </div>
                      <div className="bg-surface-0 rounded-lg p-2">
                        <p className="section-label mb-1">NAV (current)</p>
                        <p className="text-sm font-mono font-medium text-ink-primary">
                          Rs {nav.toLocaleString('en-PK', { maximumFractionDigits: 4 })}
                        </p>
                        {f.navOverride === null && f.lastUpdated && (
                          <p className="text-[10px] text-ink-muted mt-0.5">
                            {new Date(f.lastUpdated).toLocaleDateString('en-PK')}
                          </p>
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
                          {gain >= 0
                            ? <TrendingUp className="w-3.5 h-3.5 text-success" />
                            : <TrendingDown className="w-3.5 h-3.5 text-danger" />
                          }
                          <p className={`text-sm font-mono font-medium ${gain >= 0 ? 'text-success' : 'text-danger'}`}>
                            {gp}%
                          </p>
                        </div>
                        <p className={`text-[10px] font-mono mt-0.5 ${gain >= 0 ? 'text-success' : 'text-danger'}`}>
                          {gain >= 0 ? '+' : ''}{fmt(gain)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pie + summary */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-medium text-ink-primary mb-4">Allocation by type</h2>
            {byType.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-sm text-ink-muted">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byType} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {byType.map(entry => (
                      <Cell key={entry.name} fill={TYPE_COLORS[entry.name as MutualFundType] ?? '#888'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [fmt(val), '']}
                    contentStyle={{ fontSize: 12, border: '1px solid #e5e5e5', borderRadius: 8 }}
                  />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ fontSize: 11, color: '#4a4945' }}>{v}</span>}
                  />
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
                { label: 'Total invested', value: fmt(totalCost) },
                { label: 'Current value', value: fmt(totalCurrent) },
                { label: 'Unrealized gain', value: `${totalGain >= 0 ? '+' : ''}${fmt(totalGain)}`, color: totalGain >= 0 ? 'text-success' : 'text-danger' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-ink-muted text-xs">{row.label}</span>
                  <span className={`text-xs font-mono font-medium ${row.color ?? 'text-ink-primary'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
