'use client'

import { useStore, useThisMonth } from '@/lib/store'
import { fmt, fmtCompact, fiscalYearRange, daysUntil } from '@/lib/utils'
import { CATEGORY_COLORS, EXPENSE_CATEGORIES, bankAccountLabel } from '@/types'
import { computeNetWorth } from '@/lib/networth'
import MetricCard from '@/components/MetricCard'
import Badge from '@/components/Badge'
import PageHeader from '@/components/PageHeader'
import NetWorthTrendChart from '@/components/NetWorthTrendChart'
import SpendingDonutChart from '@/components/SpendingDonutChart'
import { ArrowRight, AlertTriangle, CreditCard } from 'lucide-react'
import Link from 'next/link'

const REMINDER_WINDOW_DAYS = 7

function daysRemainingInMonth(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return lastDay - now.getDate()
}

export default function Dashboard() {
  const { state } = useStore()
  const monthExpenses = useThisMonth()

  const totalSpend = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const netWorthBreakdown = computeNetWorth(state)
  const netWorth = netWorthBreakdown.netWorth
  const totalBudget = Object.values(state.budgets).reduce((s, v) => s + v, 0)
  const budgetLeft = totalBudget - totalSpend
  const spendPct = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : null

  const monthLabel = new Date().toLocaleDateString('en-PK', { month: 'short' })
  const monthKey = new Date().toISOString().slice(0, 7)
  const monthIncome = state.incomes
    .filter(i => i.date.startsWith(monthKey))
    .reduce((s, i) => s + i.amount, 0)

  // Net worth change vs the oldest snapshot on record — "since you started
  // tracking" rather than a fixed lookback window, since history length
  // varies a lot account to account.
  const oldestSnapshot = state.netWorthHistory[0]
  const netWorthChangePct = oldestSnapshot && oldestSnapshot.value !== 0
    ? Math.round(((netWorth - oldestSnapshot.value) / Math.abs(oldestSnapshot.value)) * 1000) / 10
    : null

  // Quick-glance breakdown pills — same underlying numbers as the net worth
  // formula, just surfaced individually and linked back to where each one
  // is managed.
  const bankTotal = state.bankAccounts
    .filter(b => b.type !== 'Credit Card')
    .reduce((s, b) => s + b.startingBalance, 0)
  const cardsOwed = state.bankAccounts
    .filter(b => b.type === 'Credit Card' && b.startingBalance > 0)
    .reduce((s, b) => s + b.startingBalance, 0)
  const quickStats = [
    { label: 'Bank', value: bankTotal, href: '/settings', negative: false },
    { label: 'Cards', value: cardsOwed, href: '/assets', negative: true },
    { label: 'Investments', value: netWorthBreakdown.investments, href: '/assets', negative: false },
    { label: 'Funds', value: netWorthBreakdown.mutualFunds, href: '/assets', negative: false },
  ]

  // Spending by category this month
  const catTotals = EXPENSE_CATEGORIES.map(cat => ({
    name: cat.split(' ')[0],
    fullName: cat,
    total: monthExpenses
      .filter(e => e.category === cat)
      .reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0)

  const recent = state.expenses.slice(0, 8)

  const cardReminders = state.bankAccounts
    .filter(b => b.type === 'Credit Card' && b.dueDate)
    .map(b => ({ id: b.id, name: bankAccountLabel(b), minimumPayment: b.minimumPayment, days: daysUntil(b.dueDate!) }))
    .filter(c => c.days <= REMINDER_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${new Date().toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })} · ${fiscalYearRange().label}`}
      />

      {/* Payment reminders */}
      {cardReminders.length > 0 && (
        <div className="card mb-6 border-l-4 border-l-danger">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <h2 className="text-sm font-medium text-ink-primary">Payment reminders</h2>
            <Link
              href="/settings"
              className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 ml-auto"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {cardReminders.map(c => {
              const urgent = c.days <= 3
              const color = urgent ? 'text-danger' : 'text-warning'
              const bg = urgent ? 'bg-red-50 dark:bg-danger/10' : 'bg-amber-50 dark:bg-warning/10'
              const label = c.days < 0
                ? `Overdue by ${Math.abs(c.days)}d`
                : c.days === 0
                ? 'Due today'
                : `Due in ${c.days}d`
              return (
                <div key={c.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${bg}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center ${urgent ? 'bg-danger/15' : 'bg-warning/15'}`}>
                      <CreditCard className={`w-3.5 h-3.5 ${color}`} />
                    </div>
                    <span className="text-sm text-ink-primary truncate">{c.name}</span>
                    {c.minimumPayment && (
                      <span className="text-xs font-mono text-ink-muted hidden sm:inline tabular-nums">
                        — min {fmt(c.minimumPayment)}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${color} ${bg}`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div id="net-worth" className="scroll-mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <MetricCard
          label="Net worth"
          value={fmtCompact(netWorth)}
          sub="assets + investments − liabilities"
          delta={netWorthChangePct !== null ? `${netWorthChangePct >= 0 ? '+' : ''}${netWorthChangePct}%` : undefined}
          deltaTone={netWorthChangePct !== null && netWorthChangePct < 0 ? 'negative' : 'positive'}
        />
        <MetricCard
          label={`Income · ${monthLabel}`}
          value={fmtCompact(monthIncome)}
          sub="salary + other income"
        />
        <MetricCard
          label={`Spent · ${monthLabel}`}
          value={fmtCompact(totalSpend)}
          sub={`of ${fmtCompact(totalBudget)} budgeted`}
          delta={spendPct !== null ? `${spendPct}%` : undefined}
          deltaTone={spendPct !== null && spendPct > 100 ? 'negative' : 'neutral'}
        />
        <MetricCard
          label="Budget left"
          value={fmtCompact(Math.abs(budgetLeft))}
          sub={budgetLeft < 0 ? 'over budget' : `${daysRemainingInMonth()} days remaining`}
          delta={budgetLeft < 0 ? 'over' : undefined}
          deltaTone="negative"
        />
      </div>

      {/* Quick-glance breakdown */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {quickStats.map(s => (
          <Link
            key={s.label}
            href={s.href}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-surface-1 hover:bg-surface-0 transition-colors"
          >
            <span className="text-ink-muted">{s.label}</span>
            <span className={`font-mono font-medium tabular-nums ${s.negative && s.value > 0 ? 'text-danger' : 'text-ink-primary'}`}>
              {s.negative && s.value > 0 ? '−' : ''}{fmtCompact(s.value)}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-primary">Net worth · trailing 12 months</h2>
            <Link href="/assets" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Net worth <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <NetWorthTrendChart history={state.netWorthHistory} />
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-primary">Spending by category</h2>
            <Link href="/expenses" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Expenses <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <SpendingDonutChart data={catTotals} totalSpend={totalSpend} centerLabel={`SPENT · ${monthLabel.toUpperCase()}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Budget overview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-primary">Budgets · {monthLabel}</h2>
            <Link href="/budget" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              All budgets <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {EXPENSE_CATEGORIES.slice(0, 4).map(cat => {
              const spent = monthExpenses
                .filter(e => e.category === cat)
                .reduce((s, e) => s + e.amount, 0)
              const limit = state.budgets[cat] ?? 0
              const p = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
              const over = spent > limit && limit > 0
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[cat] }} />
                      <span className="text-sm text-ink-secondary">{cat}</span>
                      {over && (
                        <span className="text-[10px] font-medium text-danger bg-red-50 dark:bg-danger/10 px-1.5 py-0.5 rounded-full">
                          over limit
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono tabular-nums">
                      <span className={over ? 'text-danger font-medium' : 'text-ink-secondary'}>{fmtCompact(spent)}</span>
                      <span className="text-ink-muted"> / {fmtCompact(limit)}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-surface-1 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${p}%`,
                        background: p < 70 ? 'rgb(var(--success))' : p < 90 ? 'rgb(var(--warning))' : 'rgb(var(--danger))',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-primary">Recent transactions</h2>
            <Link href="/expenses" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">
              No transactions yet — <Link href="/expenses" className="text-brand-600 hover:underline">add your first expense</Link>
            </p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {recent.slice(0, 4).map(e => (
                <div key={e.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: CATEGORY_COLORS[e.category] + '18',
                        color: CATEGORY_COLORS[e.category],
                      }}
                    >
                      {e.category.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-ink-primary truncate">{e.description}</p>
                      <p className="text-[11px] text-ink-muted truncate">{e.account || e.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <Badge category={e.category} colorMap={CATEGORY_COLORS} />
                    <span className="text-sm font-mono font-medium text-ink-primary tabular-nums">
                      −{fmt(e.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
