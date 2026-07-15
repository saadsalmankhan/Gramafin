'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import {
  RecurringIncome,
  Income,
  INCOME_FREQUENCIES,
  IncomeFrequency,
  INCOME_CATEGORIES,
  IncomeCategory,
  INCOME_CATEGORY_COLORS,
} from '@/types'
import { fmt, today, uid, fiscalYearRange, inFiscalYear } from '@/lib/utils'
import { computeNetWorth } from '@/lib/networth'
import MetricCard from '@/components/MetricCard'
import Badge from '@/components/Badge'
import AccountSelect from '@/components/AccountSelect'
import PageHeader from '@/components/PageHeader'
import NetWorthContribution from '@/components/NetWorthContribution'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Plus, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

export default function IncomePage() {
  const {
    state,
    addIncome: addIncomeOnServer,
    addRecurringIncome,
    deleteRecurringIncome,
    deleteIncome,
  } = useStore()
  const [mode, setMode] = useState<'one-time' | 'recurring'>('one-time')
  const [source, setSource] = useState('')
  const [category, setCategory] = useState<IncomeCategory>('Salary')
  const [amount, setAmount] = useState('')
  const [account, setAccount] = useState('Cash')
  const [frequency, setFrequency] = useState<IncomeFrequency>('Monthly')
  const [date, setDate] = useState(today())
  const [filter, setFilter] = useState<'all' | IncomeCategory>('all')
  const [error, setError] = useState('')
  const [deleteRecurringTarget, setDeleteRecurringTarget] = useState<RecurringIncome | null>(null)
  const [deleteIncomeTarget, setDeleteIncomeTarget] = useState<Income | null>(null)

  const netWorthBreakdown = computeNetWorth(state)

  const month = new Date().toISOString().slice(0, 7)
  const monthTotal = state.incomes
    .filter(i => i.date.startsWith(month))
    .reduce((s, i) => s + i.amount, 0)
  const lastMonthDate = new Date()
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
  const lastMonth = lastMonthDate.toISOString().slice(0, 7)
  const lastMonthTotal = state.incomes
    .filter(i => i.date.startsWith(lastMonth))
    .reduce((s, i) => s + i.amount, 0)
  const monthDeltaPct = lastMonthTotal > 0
    ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : null
  const fy = fiscalYearRange()
  const fyTotal = state.incomes
    .filter(i => inFiscalYear(i.date, fy))
    .reduce((s, i) => s + i.amount, 0)
  const totalAll = state.incomes.reduce((s, i) => s + i.amount, 0)

  function resetForm() {
    setSource('')
    setAmount('')
    setAccount('Cash')
    setDate(today())
  }

  function addIncome() {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    setError('')

    if (mode === 'recurring') {
      const recurring: RecurringIncome = {
        id: uid(),
        source: source.trim() || category,
        category,
        amount: amt,
        account,
        frequency,
        nextDate: date,
      }
      addRecurringIncome(recurring)
    } else {
      const income: Income = {
        id: uid(),
        source: source.trim() || category,
        category,
        amount: amt,
        account,
        date,
      }
      addIncomeOnServer(income)
    }
    resetForm()
  }

  const visible = filter === 'all'
    ? state.incomes
    : state.incomes.filter(i => i.category === filter)
  const sortedIncomes = [...visible].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div>
      <PageHeader title="Income" subtitle="Log one-off income or set up salary to auto-track it every period" />

      <NetWorthContribution
        label="Unspent income (net savings)"
        amount={netWorthBreakdown.netSavings}
        netWorth={netWorthBreakdown.netWorth}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="This month"
          value={fmt(monthTotal)}
          sub={monthDeltaPct !== null ? 'vs last month' : undefined}
          delta={monthDeltaPct !== null ? `${monthDeltaPct >= 0 ? '+' : ''}${monthDeltaPct}%` : undefined}
          deltaTone={monthDeltaPct !== null && monthDeltaPct < 0 ? 'negative' : 'positive'}
        />
        <MetricCard label={`This tax year (${fy.label})`} value={fmt(fyTotal)} sub="Jul – Jun" />
        <MetricCard label="All time" value={fmt(totalAll)} />
        <MetricCard label="Transactions" value={String(state.incomes.length)} sub="total logged" />
      </div>

      {/* Add income */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-ink-primary">Add income</h2>
          <div className="flex rounded-lg border border-gray-200 dark:border-white/10 p-0.5">
            {(['one-time', 'recurring'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={clsx(
                  'px-3 py-1 text-xs rounded-md transition-colors',
                  mode === m ? 'bg-brand-600 text-white' : 'text-ink-secondary hover:bg-surface-0'
                )}
              >
                {m === 'one-time' ? 'One-time' : 'Recurring'}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="text-xs text-danger mb-3 bg-red-50 dark:bg-danger/10 px-3 py-2 rounded">{error}</p>
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
            onKeyDown={e => e.key === 'Enter' && addIncome()}
          />
          <AccountSelect value={account} onChange={setAccount} bankAccounts={state.bankAccounts} />
        </div>
        <div className="flex gap-3 flex-wrap">
          {mode === 'recurring' && (
            <select
              className="select flex-1"
              value={frequency}
              onChange={e => setFrequency(e.target.value as IncomeFrequency)}
            >
              {INCOME_FREQUENCIES.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}
          <input
            className="input flex-1"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <button className="btn-primary" onClick={addIncome}>
            <Plus className="w-4 h-4" /> {mode === 'recurring' ? 'Add recurring income' : 'Add income'}
          </button>
        </div>
      </div>

      {/* Recurring rules */}
      {state.recurringIncomes.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-sm font-medium text-ink-primary mb-4">Recurring income</h2>
          <div className="divide-y divide-gray-50 dark:divide-white/5">
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
                  <Badge category={r.category} colorMap={INCOME_CATEGORY_COLORS} />
                  <span className="text-sm font-mono font-medium text-success tabular-nums">+{fmt(r.amount)}</span>
                  <button
                    className="btn-danger"
                    onClick={() => setDeleteRecurringTarget(r)}
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
            <div className="grid grid-cols-[1fr_150px_120px_140px_100px_40px] gap-2 px-2 pb-2 border-b border-gray-100 dark:border-white/10">
              <p className="section-label">Source</p>
              <p className="section-label">Category</p>
              <p className="section-label">Account</p>
              <p className="section-label">Date</p>
              <p className="section-label text-right">Amount</p>
              <p className="section-label" aria-hidden="true"></p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {sortedIncomes.map(i => (
                <div key={i.id} className="grid grid-cols-[1fr_150px_120px_140px_100px_40px] gap-2 items-center px-2 py-3 hover:bg-surface-0 rounded-lg transition-colors">
                  <span className="text-sm text-ink-primary truncate">{i.source}</span>
                  <Badge category={i.category} colorMap={INCOME_CATEGORY_COLORS} />
                  <span className="text-xs text-ink-muted truncate flex items-center gap-1 min-w-0">
                    <span className="truncate">{i.account}</span>
                    {i.depositedToAccountId && (
                      <CheckCircle2
                        className="w-3 h-3 text-success flex-shrink-0"
                        aria-label="Deposited to this account's balance"
                      >
                        <title>Deposited to this account&apos;s balance — counted there, not in net savings</title>
                      </CheckCircle2>
                    )}
                  </span>
                  <span className="text-xs text-ink-muted font-mono">{i.date}</span>
                  <span className="text-sm font-mono font-medium text-success text-right tabular-nums">
                    +{fmt(i.amount)}
                  </span>
                  <button
                    className="btn-danger"
                    onClick={() => setDeleteIncomeTarget(i)}
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

      <ConfirmDialog
        open={deleteRecurringTarget !== null}
        title={`Stop recurring income "${deleteRecurringTarget?.source}"?`}
        message="This stops future auto-generated entries for this recurring income. Entries already logged from it will stay in your income log. This can't be undone."
        confirmLabel="Stop recurring"
        onConfirm={() => {
          if (deleteRecurringTarget) deleteRecurringIncome(deleteRecurringTarget.id)
          setDeleteRecurringTarget(null)
        }}
        onCancel={() => setDeleteRecurringTarget(null)}
      />
      <ConfirmDialog
        open={deleteIncomeTarget !== null}
        title={`Delete "${deleteIncomeTarget?.source}"?`}
        message="This will permanently remove this income entry. This can't be undone."
        onConfirm={() => {
          if (deleteIncomeTarget) deleteIncome(deleteIncomeTarget.id)
          setDeleteIncomeTarget(null)
        }}
        onCancel={() => setDeleteIncomeTarget(null)}
      />
    </div>
  )
}
