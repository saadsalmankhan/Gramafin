'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory, CATEGORY_COLORS } from '@/types'
import { fmt, today, uid } from '@/lib/utils'
import MetricCard from '@/components/MetricCard'
import Badge from '@/components/Badge'
import AccountSelect from '@/components/AccountSelect'
import PageHeader from '@/components/PageHeader'
import ConfirmDialog from '@/components/ConfirmDialog'
import TourHighlight from '@/components/TourHighlight'
import { Plus, Trash2, Paperclip, Search, FileDown, Sheet, Loader2 } from 'lucide-react'
import { bankAccountLabel } from '@/types'

export default function ExpensesPage() {
  const { state, addExpense, deleteExpense } = useStore()
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Food & Dining')
  const [account, setAccount] = useState('Cash')
  const [date, setDate] = useState(today())
  const [receipt, setReceipt] = useState<File | null>(null)
  const [filter, setFilter] = useState<'all' | ExpenseCategory>('all')
  const [monthFilter, setMonthFilter] = useState(today().slice(0, 7))
  const [accountFilter, setAccountFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  const month = new Date().toISOString().slice(0, 7)
  const monthTotal = state.expenses
    .filter(e => e.date.startsWith(month))
    .reduce((s, e) => s + e.amount, 0)
  const totalAll = state.expenses.reduce((s, e) => s + e.amount, 0)
  const totalBudget = Object.values(state.budgets).reduce((s, v) => s + v, 0)
  const spendPct = totalBudget > 0 ? Math.round((monthTotal / totalBudget) * 100) : null

  async function add() {
    if (!desc.trim()) { setError('Description is required'); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    setError('')

    let receiptUrl: string | undefined
    if (receipt) {
      setUploading(true)
      try {
        const form = new FormData()
        form.append('file', receipt)
        const res = await fetch('/api/upload/receipt', { method: 'POST', body: form })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || 'Upload failed')
        receiptUrl = body.url
      } catch (err) {
        setUploading(false)
        setError(err instanceof Error ? err.message : 'Failed to upload receipt')
        return
      }
      setUploading(false)
    }

    const expense: Expense = {
      id: uid(),
      description: desc.trim(),
      amount: amt,
      category,
      account,
      date,
      ...(receiptUrl ? { receiptUrl } : {}),
    }
    addExpense(expense)
    setDesc('')
    setAmount('')
    setAccount('Cash')
    setDate(today())
    setReceipt(null)
  }

  function removeExpense(e: Expense) {
    deleteExpense(e.id)
    if (e.receiptUrl) {
      fetch('/api/upload/receipt', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: e.receiptUrl }),
      }).catch(err => console.error('Failed to delete receipt:', err))
    }
  }

  const availableMonths = Array.from(new Set([month, ...state.expenses.map(e => e.date.slice(0, 7))])).sort(
    (a, b) => b.localeCompare(a)
  )
  const monthLabel = (m: string) =>
    new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const visible = state.expenses.filter(e => {
    if (filter !== 'all' && e.category !== filter) return false
    if (monthFilter !== 'all' && !e.date.startsWith(monthFilter)) return false
    if (accountFilter !== 'all' && (e.account || 'Cash') !== accountFilter) return false
    if (search.trim() && !e.description.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })

  const filterSummary = [
    monthFilter === 'all' ? 'All time' : monthLabel(monthFilter),
    filter !== 'all' ? filter : null,
    accountFilter !== 'all' ? accountFilter : null,
    search.trim() ? `"${search.trim()}"` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCsv() {
    setExporting('csv')
    const header = ['Description', 'Category', 'Account', 'Date', 'Amount (PKR)']
    const rows = visible.map(e => [e.description, e.category, e.account || 'Cash', e.date, String(e.amount)])
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `Gramafin Expenses - ${filterSummary}.csv`)
    setExporting(null)
  }

  async function exportPdf() {
    setExporting('pdf')
    try {
      const res = await fetch('/api/export/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: visible, filterSummary }),
      })
      if (!res.ok) throw new Error('Export failed')
      downloadBlob(await res.blob(), `Gramafin Expenses - ${filterSummary}.pdf`)
    } catch {
      setError('Failed to export PDF — try again')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Track every rupee you spend" />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="This month"
          value={fmt(monthTotal)}
          delta={spendPct !== null ? `${spendPct}%` : undefined}
          deltaTone={spendPct !== null && spendPct > 100 ? 'negative' : 'neutral'}
          sub={totalBudget > 0 ? `of ${fmt(totalBudget)} budget` : undefined}
        />
        <MetricCard label="All time" value={fmt(totalAll)} />
        <MetricCard label="Transactions" value={String(state.expenses.length)} sub="total logged" />
      </div>

      {/* Add form */}
      <TourHighlight label="Log your expense here">
      <div className="card mb-6">
        <h2 className="text-sm font-medium text-ink-primary mb-4">Add expense</h2>
        {error && (
          <p className="text-xs text-danger mb-3 bg-red-50 dark:bg-danger/10 px-3 py-2 rounded">{error}</p>
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
          <AccountSelect
            value={account}
            onChange={setAccount}
            bankAccounts={state.bankAccounts}
            className="select flex-1"
          />
          <input
            className="input flex-1"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <label className="btn-ghost cursor-pointer">
            <Paperclip className="w-4 h-4" />
            {receipt ? receipt.name : 'Attach receipt'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={e => setReceipt(e.target.files?.[0] ?? null)}
            />
          </label>
          <button className="btn-primary" onClick={add} disabled={uploading}>
            <Plus className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Add expense'}
          </button>
        </div>
      </div>
      </TourHighlight>

      {/* List */}
      <div className="card">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-sm font-medium text-ink-primary">
            Expenses
            <span className="ml-2 text-ink-muted font-normal">({visible.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost h-8 text-xs"
              onClick={exportCsv}
              disabled={exporting !== null || visible.length === 0}
            >
              {exporting === 'csv' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sheet className="w-3.5 h-3.5" />}
              CSV
            </button>
            <button
              className="btn-ghost h-8 text-xs"
              onClick={exportPdf}
              disabled={exporting !== null || visible.length === 0}
            >
              {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              {exporting === 'pdf' ? 'Generating…' : 'PDF'}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="input pl-8 h-8 text-xs w-full"
              placeholder="Search description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select text-xs h-8"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
          >
            <option value="all">All time</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
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
          <select
            className="select text-xs h-8"
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
          >
            <option value="all">All accounts</option>
            <option value="Cash">Cash</option>
            {state.bankAccounts.map(b => (
              <option key={b.id} value={bankAccountLabel(b)}>{bankAccountLabel(b)}</option>
            ))}
          </select>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-10">No expenses found</p>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_140px_100px_40px] gap-2 px-2 pb-2 border-b border-gray-100 dark:border-white/10">
              <p className="section-label">Description</p>
              <p className="section-label">Category</p>
              <p className="section-label">Date</p>
              <p className="section-label text-right">Amount</p>
              <p className="section-label" aria-hidden="true"></p>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {visible.map(e => (
                <div key={e.id} className="grid grid-cols-[1fr_120px_140px_100px_40px] gap-2 items-center px-2 py-3 hover:bg-surface-0 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                      style={{ background: CATEGORY_COLORS[e.category] + '18', color: CATEGORY_COLORS[e.category] }}
                    >
                      {e.category.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm text-ink-primary truncate block">{e.description}</span>
                      {e.account && <span className="text-[11px] text-ink-muted">{e.account}</span>}
                    </div>
                    {e.receiptUrl && (
                      <a
                        href={`/api/upload/receipt?url=${encodeURIComponent(e.receiptUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink-muted hover:text-ink-primary flex-shrink-0"
                        aria-label="View receipt"
                        title="View receipt"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <Badge category={e.category} colorMap={CATEGORY_COLORS} />
                  <span className="text-xs text-ink-muted font-mono">{e.date}</span>
                  <span className="text-sm font-mono font-medium text-ink-primary text-right tabular-nums">
                    −{fmt(e.amount)}
                  </span>
                  <button
                    className="btn-danger"
                    onClick={() => setDeleteTarget(e)}
                    aria-label="Delete expense"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {visible.length > 0 && (
              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/10 mt-2">
                <div className="text-right">
                  <p className="text-xs text-ink-muted mb-0.5">
                    Total · {visible.length} transaction{visible.length === 1 ? '' : 's'}
                  </p>
                  <p className="text-base font-mono font-semibold text-ink-primary">
                    −{fmt(visible.reduce((s, e) => s + e.amount, 0))}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this expense?"
        message={`This will permanently remove "${deleteTarget?.description}"${deleteTarget?.receiptUrl ? ' and its attached receipt' : ''}. This can't be undone.`}
        onConfirm={() => {
          if (deleteTarget) removeExpense(deleteTarget)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
