'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory, CATEGORY_COLORS } from '@/types'
import { fmt, today, uid } from '@/lib/utils'
import MetricCard from '@/components/MetricCard'
import CategoryBadge from '@/components/CategoryBadge'
import PageHeader from '@/components/PageHeader'
import { Plus, Trash2 } from 'lucide-react'

export default function ExpensesPage() {
  const { state, dispatch } = useStore()
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Food & Dining')
  const [date, setDate] = useState(today())
  const [filter, setFilter] = useState<'all' | ExpenseCategory>('all')
  const [error, setError] = useState('')

  const month = new Date().toISOString().slice(0, 7)
  const monthTotal = state.expenses
    .filter(e => e.date.startsWith(month))
    .reduce((s, e) => s + e.amount, 0)
  const totalAll = state.expenses.reduce((s, e) => s + e.amount, 0)

  function add() {
    if (!desc.trim()) { setError('Description is required'); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    setError('')
    const expense: Expense = {
      id: uid(),
      description: desc.trim(),
      amount: amt,
      category,
      date,
    }
    dispatch({ type: 'ADD_EXPENSE', payload: expense })
    setDesc('')
    setAmount('')
    setDate(today())
  }

  const visible = filter === 'all'
    ? state.expenses
    : state.expenses.filter(e => e.category === filter)

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Track every rupee you spend" />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard label="This month" value={fmt(monthTotal)} variant="negative" />
        <MetricCard label="All time" value={fmt(totalAll)} />
        <MetricCard label="Transactions" value={String(state.expenses.length)} sub="total logged" />
      </div>

      {/* Add form */}
      <div className="card mb-6">
        <h2 className="text-sm font-medium text-ink-primary mb-4">Add expense</h2>
        {error && (
          <p className="text-xs text-danger mb-3 bg-red-50 px-3 py-2 rounded">{error}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            className="input"
            placeholder="Description"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <input
            className="input font-mono"
            type="number"
            placeholder="Amount (PKR)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            className="select flex-1"
            value={category}
            onChange={e => setCategory(e.target.value as ExpenseCategory)}
          >
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            className="input flex-1"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <button className="btn-primary" onClick={add}>
            <Plus className="w-4 h-4" /> Add expense
          </button>
        </div>
      </div>

      {/* List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-ink-primary">
            {filter === 'all' ? 'All expenses' : filter}
            <span className="ml-2 text-ink-muted font-normal">({visible.length})</span>
          </h2>
          <select
            className="select text-xs h-8"
            value={filter}
            onChange={e => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">All categories</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-10">No expenses found</p>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_140px_100px_40px] gap-2 px-2 pb-2 border-b border-gray-100">
              {['Description', 'Category', 'Date', 'Amount', ''].map(h => (
                <p key={h} className="section-label">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {visible.map(e => (
                <div key={e.id} className="grid grid-cols-[1fr_120px_140px_100px_40px] gap-2 items-center px-2 py-3 hover:bg-surface-0 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                      style={{ background: CATEGORY_COLORS[e.category] + '18', color: CATEGORY_COLORS[e.category] }}
                    >
                      {e.category.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-ink-primary truncate">{e.description}</span>
                  </div>
                  <CategoryBadge category={e.category} />
                  <span className="text-xs text-ink-muted font-mono">{e.date}</span>
                  <span className="text-sm font-mono font-medium text-danger">
                    −{fmt(e.amount)}
                  </span>
                  <button
                    className="btn-danger"
                    onClick={() => dispatch({ type: 'DELETE_EXPENSE', payload: e.id })}
                    aria-label="Delete expense"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {visible.length > 0 && (
              <div className="flex justify-end pt-4 border-t border-gray-100 mt-2">
                <div className="text-right">
                  <p className="text-xs text-ink-muted mb-0.5">
                    {filter === 'all' ? 'Total' : `Total — ${filter}`}
                  </p>
                  <p className="text-base font-mono font-semibold text-danger">
                    −{fmt(visible.reduce((s, e) => s + e.amount, 0))}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
