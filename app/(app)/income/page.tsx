'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import {
  RecurringIncome,
  INCOME_FREQUENCIES,
  IncomeFrequency,
  INCOME_CATEGORIES,
  IncomeCategory,
} from '@/types'
import { fmt, today, uid, fiscalYearRange, inFiscalYear } from '@/lib/utils'
import MetricCard from '@/components/MetricCard'
import IncomeCategoryBadge from '@/components/IncomeCategoryBadge'
import PageHeader from '@/components/PageHeader'
import { Plus, Trash2, RefreshCw } from 'lucide-react'

export default function IncomePage() {
  const { state, dispatch } = useStore()
  const [source, setSource] = useState('')
  const [category, setCategory] = useState<IncomeCategory>('Salary')
  const [amount, setAmount] = useState('')
  const [account, setAccount] = useState('')
  const [frequency, setFrequency] = useState<IncomeFrequency>('Monthly')
  const [startDate, setStartDate] = useState(today())
  const [filter, setFilter] = useState<'all' | IncomeCategory>('all')
  const [error, setError] = useState('')

  const month = new Date().toISOString().slice(0, 7)
  const monthTotal = state.incomes
    .filter(i => i.date.startsWith(month))
    .reduce((s, i) => s + i.amount, 0)
  const fy = fiscalYearRange()
  const fyTotal = state.incomes
    .filter(i => inFiscalYear(i.date, fy))
    .reduce((s, i) => s + i.amount, 0)
  const totalAll = state.incomes.reduce((s, i) => s + i.amount, 0)

  const cashBankAccounts = state.assets
    .filter(a => a.category === 'Cash / Bank')
    .map(a => a.name)
  const accountOptions = Array.from(new Set(['Cash', ...cashBankAccounts]))

  function addRecurring() {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    if (!account.trim()) { setError('Account is required (or enter "Cash")'); return }
    setError('')
    const recurring: RecurringIncome = {
      id: uid(),
      source: source.trim() || category,
      category,
      amount: amt,
      account: account.trim(),
      frequency,
      nextDate: startDate,
    }
    dispatch({ type: 'ADD_RECURRING_INCOME', payload: recurring })
    setSource('')
    setAmount('')
    setAccount('')
    setStartDate(today())
  }

  const visible = filter === 'all'
    ? state.incomes
    : state.incomes.filter(i => i.category === filter)
  const sortedIncomes = [...visible].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div>
      <PageHeader title="Income" subtitle="Set up salary and other income to auto-track it every period" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricCard label="This month" value={fmt(monthTotal)} variant="positive" />
        <MetricCard label={`This tax year (${fy.label})`} value={fmt(fyTotal)} variant="positive" sub="Jul – Jun" />
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
          <select
            className="select"
            value={category}
            onChange={e => setCategory(e.target.value as IncomeCategory)}
          >
            {INCOME_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Label (optional, e.g. employer or property name)"
            value={source}
            onChange={e => setSource(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            className="input font-mono"
            type="number"
            placeholder="Amount (PKR)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRecurring()}
          />
          <input
            className="input"
            list="income-accounts"
            placeholder="Account (or Cash)"
            value={account}
            onChange={e => setAccount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRecurring()}
          />
          <datalist id="income-accounts">
            {accountOptions.map(a => <option key={a} value={a} />)}
          </datalist>
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
              <div key={r.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center bg-success/10 text-success">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-ink-primary truncate">{r.source}</p>
                    <p className="text-[11px] text-ink-muted">
                      {r.account} · {r.frequency} · next {r.nextDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <IncomeCategoryBadge category={r.category} />
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-ink-primary">
            {filter === 'all' ? 'Income log' : filter}
            <span className="ml-2 text-ink-muted font-normal">({sortedIncomes.length})</span>
          </h2>
          <select
            className="select text-xs h-8"
            value={filter}
            onChange={e => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">All categories</option>
            {INCOME_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {sortedIncomes.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-10">No income logged yet</p>
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_150px_120px_140px_100px_40px] gap-2 px-2 pb-2 border-b border-gray-100">
              {['Source', 'Category', 'Account', 'Date', 'Amount', ''].map(h => (
                <p key={h} className="section-label">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {sortedIncomes.map(i => (
                <div key={i.id} className="grid grid-cols-[1fr_150px_120px_140px_100px_40px] gap-2 items-center px-2 py-3 hover:bg-surface-0 rounded-lg transition-colors">
                  <span className="text-sm text-ink-primary truncate">{i.source}</span>
                  <IncomeCategoryBadge category={i.category} />
                  <span className="text-xs text-ink-muted truncate">{i.account}</span>
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
