'use client'

import { useStore, useThisMonth } from '@/lib/store'
import { EXPENSE_CATEGORIES, ExpenseCategory, CATEGORY_COLORS } from '@/types'
import { fmt } from '@/lib/utils'
import MetricCard from '@/components/MetricCard'
import PageHeader from '@/components/PageHeader'

export default function BudgetPage() {
  const { state, setBudget: setBudgetOnServer } = useStore()
  const monthExpenses = useThisMonth()

  const totalBudget = Object.values(state.budgets).reduce((s, v) => s + v, 0)
  const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const remaining = totalBudget - totalSpent
  const overBudgetCats = EXPENSE_CATEGORIES.filter(cat => {
    const spent = monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
    return spent > (state.budgets[cat] ?? 0) && (state.budgets[cat] ?? 0) > 0
  }).length

  function setBudget(cat: ExpenseCategory, val: string) {
    const n = parseFloat(val) || 0
    setBudgetOnServer(cat, n)
  }

  return (
    <div>
      <PageHeader title="Budget" subtitle="Set monthly spending limits per category" />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard label="Total budget" value={fmt(totalBudget)} />
        <MetricCard
          label="Remaining"
          value={fmt(Math.abs(remaining))}
          sub={remaining < 0 ? 'over budget' : 'left this month'}
          variant={remaining >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Over limit"
          value={String(overBudgetCats)}
          sub="categories"
          variant={overBudgetCats > 0 ? 'negative' : 'positive'}
        />
      </div>

      {/* Budget setter + progress */}
      <div className="card mb-6">
        <h2 className="text-sm font-medium text-ink-primary mb-1">Monthly limits</h2>
        <p className="text-xs text-ink-muted mb-5">Changes save automatically</p>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[1fr_140px] gap-4 px-2 pb-2 border-b border-gray-100 dark:border-white/10">
            <p className="section-label">Category</p>
            <p className="section-label text-right">Monthly limit (PKR)</p>
          </div>
          {EXPENSE_CATEGORIES.map(cat => (
            <div key={cat} className="grid grid-cols-[1fr_140px] gap-4 items-center px-2 py-1.5 rounded-lg hover:bg-surface-0 transition-colors">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: CATEGORY_COLORS[cat] }}
                />
                <span className="text-sm text-ink-secondary">{cat}</span>
              </div>
              <input
                className="input text-right font-mono h-8 text-sm"
                type="number"
                value={state.budgets[cat] ?? 0}
                onChange={e => setBudget(cat, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="card">
        <h2 className="text-sm font-medium text-ink-primary mb-5">Spending vs budget this month</h2>
        <div className="space-y-5">
          {EXPENSE_CATEGORIES.map(cat => {
            const spent = monthExpenses
              .filter(e => e.category === cat)
              .reduce((s, e) => s + e.amount, 0)
            const limit = state.budgets[cat] ?? 0
            const p = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
            const over = spent > limit && limit > 0
            const barColor = p < 70 ? 'rgb(var(--success))' : p < 90 ? 'rgb(var(--warning))' : 'rgb(var(--danger))'

            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: CATEGORY_COLORS[cat] }}
                    />
                    <span className="text-sm text-ink-secondary">{cat}</span>
                    {over && (
                      <span className="text-[10px] font-medium text-danger bg-red-50 dark:bg-danger/10 px-1.5 py-0.5 rounded">
                        over limit
                      </span>
                    )}
                  </div>
                  <div className="text-right text-[11px] font-mono">
                    <span className={over ? 'text-danger font-medium' : 'text-ink-secondary'}>
                      {fmt(spent)}
                    </span>
                    <span className="text-ink-muted"> / {fmt(limit)}</span>
                  </div>
                </div>
                <div className="h-2 bg-surface-1 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${p}%`, background: barColor }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
