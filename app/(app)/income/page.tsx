'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { RecurringIncome, INCOME_FREQUENCIES, IncomeFrequency } from '@/types'
import { fmt, today, uid } from '@/lib/utils'
import MetricCard from '@/components/MetricCard'
import PageHeader from '@/components/PageHeader'
import { Plus, Trash2, RefreshCw } from 'lucide-react'

export default function IncomePage() {
  const { state, dispatch } = useStore()
  const [source, setSource] = useState('Salary')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<IncomeFrequency>('Monthly')
  const [startDate, setStartDate] = useState(today())
  const [error, setError] = useState('')

  const month = new Date().toISOString().slice(0, 7)
  const monthTotal = state.incomes
    .filter(i => i.date.startsWith(month))
    .reduce((s, i) => s + i.amount, 0)
  const totalAll = state.incomes.reduce((s, i) => s + i.amount, 0)

  function addRecurring() {
    if (!source.trim()) { setError('Source is required'); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    setError('')
    const recurring: RecurringIncome = {
      id: uid(),
      source: source.trim(),
      amount: amt,
      frequency,
      nextDate: startDate,
    }
    dispatch({ type: 'ADD_RECURRING_INCOME', payload: recurring })
    setSource('Salary')
    setAmount('')
    setStartDate(today())
  }

  const sortedIncomes = [...state.incomes].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div>
      <PageHeader title="Income" subtitle="Set up salary and other income to auto-track it every period" />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard label="This month" value={fmt(monthTotal)} variant="positive" />
        <MetricCard label="All time" value={fmt(totalAll)} />
        <MetricCard label="Transactions" value={String(state.incomes.length)} sub="total logged" />
      </div>

      {/* Add recurring income */}
      <div className="card mb-6">
        <h2 className="text-sm font-medium text-ink-primary mb-4">Add recurring income</h2>
        {error && (
          <p className="text-xs text-danger mb-3 bg-red-50 px-3 py-2 rounded">{error}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            className="input"
            placeholder="Source (e.g. Salary)"
            value={source}
            onChange={e => setSource(e.target.value)}
          />
          <input
            className="input font-mono"
            type="number"
            placeholder="Amount (PKR)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRecurring()}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            className="select flex-1"
            value={frequency}
            onChange={e => setFrequency(e.target.value as IncomeFrequency)}
          >
            {INCOME_FREQUENCIES.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <input
            className="input flex-1"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <button className="btn-primary" onClick={addRecurring}>
            <Plus className="w-4 h-4" /> Add recurring income
          </button>
        </div>
      </div>

      {/* Recurring rules */}
      {state.recurringIncomes.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-medium text-ink-primary mb-4">Recurring income</h2>
          <div className="divide-y divide-gray-50">
            {state.recurringIncomes.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center bg-success/10 text-success">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-ink-primary truncate">{r.source}</p>
                    <p className="text-[11px] text-ink-muted">
                      {r.frequency} · next {r.nextDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-medium text-success">+{fmt(r.amount)}</span>
                  <button
                    className="btn-danger"
                    onClick={() => dispatch({ type: 'DELETE_RECURRING_INCOME', payload: r.id })}
                    aria-label="Delete recurring income"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income log */}
      <div className="card">
        <h2 className="text-sm font-medium text-ink-primary mb-4">
          Income log
          <span className="ml-2 text-ink-muted font-normal">({sortedIncomes.length})</span>
        </h2>

        {sortedIncomes.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-10">No income logged yet</p>
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_140px_100px_40px] gap-2 px-2 pb-2 border-b border-gray-100">
              {['Source', 'Date', 'Amount', ''].map(h => (
                <p key={h} className="section-label">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {sortedIncomes.map(i => (
                <div key={i.id} className="grid grid-cols-[1fr_140px_100px_40px] gap-2 items-center px-2 py-3 hover:bg-surface-0 rounded-lg transition-colors">
                  <span className="text-sm text-ink-primary truncate">{i.source}</span>
                  <span className="text-xs text-ink-muted font-mono">{i.date}</span>
                  <span className="text-sm font-mono font-medium text-success">
                    +{fmt(i.amount)}
                  </span>
                  <button
                    className="btn-danger"
                    onClick={() => dispatch({ type: 'DELETE_INCOME', payload: i.id })}
                    aria-label="Delete income"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
