'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Investment, INVESTMENT_TYPES, InvestmentType } from '@/types'
import { fmt, fmtCompact, gainPct, uid } from '@/lib/utils'
import MetricCard from '@/components/MetricCard'
import PageHeader from '@/components/PageHeader'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const TYPE_COLORS: Record<InvestmentType, string> = {
  'Stocks':       '#2a78d6',
  'Mutual funds': '#1baf7a',
  'Crypto':       '#eda100',
  'Bonds':        '#4a3aa7',
  'Other':        '#73726c',
}

export default function InvestmentsPage() {
  const { state, dispatch } = useStore()
  const [name, setName] = useState('')
  const [type, setType] = useState<InvestmentType>('Stocks')
  const [cost, setCost] = useState('')
  const [current, setCurrent] = useState('')
  const [error, setError] = useState('')

  const totalCost = state.investments.reduce((s, i) => s + i.amountInvested, 0)
  const totalCurrent = state.investments.reduce((s, i) => s + i.currentValue, 0)
  const totalGain = totalCurrent - totalCost
  const overallReturn = gainPct(totalCost, totalCurrent)

  // Pie data by type
  const byType = INVESTMENT_TYPES.map(t => ({
    name: t,
    value: state.investments
      .filter(i => i.type === t)
      .reduce((s, i) => s + i.currentValue, 0),
  })).filter(d => d.value > 0)

  function add() {
    if (!name.trim()) { setError('Name is required'); return }
    const c = parseFloat(cost)
    const v = parseFloat(current)
    if (isNaN(c) || c <= 0) { setError('Enter a valid invested amount'); return }
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
    setName('')
    setCost('')
    setCurrent('')
  }

  return (
    <div>
      <PageHeader title="Investments" subtitle="Monitor your portfolio performance" />

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
        {error && <p className="text-xs text-danger mb-3 bg-red-50 px-3 py-2 rounded">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            className="input"
            placeholder="Investment name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <select
            className="select w-full"
            value={type}
            onChange={e => setType(e.target.value as InvestmentType)}
          >
            {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex gap-3 flex-wrap">
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
          <button className="btn-primary" onClick={add}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Portfolio table */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-medium text-ink-primary mb-4">Holdings</h2>
          {state.investments.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">No investments added yet</p>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_80px_100px_100px_90px_36px] gap-2 px-2 pb-2 border-b border-gray-100">
                {['Name', 'Type', 'Invested', 'Current', 'Gain/Loss', ''].map(h => (
                  <p key={h} className="section-label">{h}</p>
                ))}
              </div>
              <div className="divide-y divide-gray-50">
                {state.investments.map(inv => {
                  const gain = inv.currentValue - inv.amountInvested
                  const gp = gainPct(inv.amountInvested, inv.currentValue)
                  return (
                    <div
                      key={inv.id}
                      className="grid grid-cols-[1fr_80px_100px_100px_90px_36px] gap-2 items-center px-2 py-3 hover:bg-surface-0 rounded-lg transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-primary truncate">{inv.name}</p>
                      </div>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-block"
                        style={{
                          background: TYPE_COLORS[inv.type] + '18',
                          color: TYPE_COLORS[inv.type],
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
                      <button
                        className="btn-danger"
                        onClick={() => dispatch({ type: 'DELETE_INVESTMENT', payload: inv.id })}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name as InvestmentType] ?? '#888'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [fmt(val), '']}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e5e5', borderRadius: 8 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: '#4a4945' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
