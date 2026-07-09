'use client'

import { useStore, useThisMonth } from '@/lib/store'
import { fmt, fmtCompact, gainPct, daysUntil } from '@/lib/utils'
import { CATEGORY_COLORS, EXPENSE_CATEGORIES, ExpenseCategory, bankAccountLabel } from '@/types'
import { computeNetWorth } from '@/lib/networth'
import { useChartColors } from '@/lib/theme'
import MetricCard from '@/components/MetricCard'
import Badge from '@/components/Badge'
import PageHeader from '@/components/PageHeader'
import NetWorthTrendChart from '@/components/NetWorthTrendChart'
import NetWorthBreakdownChart from '@/components/NetWorthBreakdownChart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ArrowRight, AlertTriangle, CreditCard } from 'lucide-react'
import Link from 'next/link'

const REMINDER_WINDOW_DAYS = 7

export default function Dashboard() {
  const { state } = useStore()
  const monthExpenses = useThisMonth()
  const chartColors = useChartColors()

  const totalSpend = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const netWorthBreakdown = computeNetWorth(state)
  const netWorth = netWorthBreakdown.netWorth
  const totalBudget = Object.values(state.budgets).reduce((s, v) => s + v, 0)
  const budgetLeft = totalBudget - totalSpend
  const portfolioValue = netWorthBreakdown.investments + netWorthBreakdown.mutualFunds
  const portfolioCost = state.investments.reduce((s, i) => s + i.amountInvested, 0)
    + state.mutualFunds.reduce((s, f) => s + f.unitsHeld * f.buyNav, 0)
  const portfolioGain = portfolioValue - portfolioCost

  // Spending by category this month
  const catTotals = EXPENSE_CATEGORIES.map(cat => ({
    name: cat.split(' ')[0],
    fullName: cat,
    total: monthExpenses
      .filter(e => e.category === cat)
      .reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0)

  const recent = state.expenses.slice(0, 8)

  const assetCardReminders = state.assets
    .filter(a => a.category === 'Credit card' && a.dueDate)
    .map(a => ({ id: a.id, name: a.name, minimumPayment: a.minimumPayment, days: daysUntil(a.dueDate!) }))
  const bankCardReminders = state.bankAccounts
    .filter(b => b.type === 'Credit Card' && b.dueDate)
    .map(b => ({ id: b.id, name: bankAccountLabel(b), minimumPayment: undefined as number | undefined, days: daysUntil(b.dueDate!) }))
  const cardReminders = [...assetCardReminders, ...bankCardReminders]
    .filter(c => c.days <= REMINDER_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}
      />

      {/* Payment reminders */}
      {cardReminders.length > 0 && (
        <div className="card mb-6 border-l-4 border-l-danger">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <h2 className="text-sm font-medium text-ink-primary">Payment reminders</h2>
            <Link
              href={bankCardReminders.length > 0 && assetCardReminders.length === 0 ? '/settings' : '/assets'}
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
              return (
                <div key={c.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${bg}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CreditCard className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
                    <span className="text-sm text-ink-primary truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {c.minimumPayment && (
                      <span className="text-xs font-mono text-ink-muted hidden sm:inline">
                        Min {fmt(c.minimumPayment)}
                      </span>
                    )}
                    <span className={`text-xs font-medium ${color}`}>
                      {c.days < 0
                        ? `Overdue by ${Math.abs(c.days)}d`
                        : c.days === 0
                        ? 'Due today'
                        : `Due in ${c.days}d`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Net worth"
          value={fmtCompact(netWorth)}
          sub="assets + investments + savings − liabilities"
          variant={netWorth >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Spent this month"
          value={fmtCompact(totalSpend)}
          sub={`of ${fmtCompact(totalBudget)} budget`}
          variant="negative"
        />
        <MetricCard
          label="Budget remaining"
          value={fmtCompact(Math.abs(budgetLeft))}
          sub={budgetLeft < 0 ? 'over budget' : 'left to spend'}
          variant={budgetLeft >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Portfolio value"
          value={fmtCompact(portfolioValue)}
          sub={`${portfolioGain >= 0 ? '+' : ''}${gainPct(portfolioCost, portfolioValue)}% return`}
          variant={portfolioGain >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div id="net-worth" className="scroll-mt-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[11px] text-ink-muted">Rolls up:</span>
          {[
            { label: 'Assets', href: '/assets' },
            { label: 'Investments', href: '/investments' },
            { label: 'Bank accounts', href: '/settings' },
            { label: 'Mutual funds', href: '/mutual-funds' },
            { label: 'Income & expenses', href: '/income' },
          ].map(s => (
            <Link
              key={s.href}
              href={s.href}
              className="text-[11px] px-2 py-0.5 rounded-full bg-surface-1 text-ink-secondary hover:bg-surface-0 hover:text-brand-700 transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h2 className="text-sm font-medium text-ink-primary mb-4">Net worth over time</h2>
            <NetWorthTrendChart history={state.netWorthHistory} />
          </div>
          <div className="card">
            <h2 className="text-sm font-medium text-ink-primary mb-4">Net worth breakdown</h2>
            <NetWorthBreakdownChart breakdown={netWorthBreakdown} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Spending chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-primary">Spending by category</h2>
            <Link href="/expenses" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {catTotals.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-ink-muted">
              No expenses logged this month
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={catTotals} barSize={28}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: chartColors.axisText }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.axisText }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => 'Rs ' + Math.round(v / 1000) + 'K'}
                  width={60}
                />
                <Tooltip
                  formatter={(val: number, _: string, props: { payload?: { fullName?: string } }) => [
                    fmt(val),
                    props.payload?.fullName ?? '',
                  ]}
                  contentStyle={{
                    fontSize: 12,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: 8,
                    background: chartColors.tooltipBg,
                    color: chartColors.mutedText,
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {catTotals.map((c) => (
                    <Cell
                      key={c.fullName}
                      fill={CATEGORY_COLORS[c.fullName as ExpenseCategory] ?? '#888'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Budget overview mini */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-primary">Budget status</h2>
            <Link href="/budget" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Edit <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {EXPENSE_CATEGORIES.slice(0, 6).map(cat => {
              const spent = monthExpenses
                .filter(e => e.category === cat)
                .reduce((s, e) => s + e.amount, 0)
              const limit = state.budgets[cat] ?? 0
              const p = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
              const over = spent > limit && limit > 0
              return (
                <div key={cat}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-ink-secondary truncate pr-2">{cat.split(' ')[0]}</span>
                    <span className={over ? 'text-danger font-medium' : 'text-ink-muted'}>
                      {p}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-1 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${p}%`,
                        background: p < 70 ? '#15803d' : p < 90 ? '#d97706' : '#dc2626',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
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
            {recent.map(e => (
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
                    <p className="text-[11px] text-ink-muted">{e.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <Badge category={e.category} colorMap={CATEGORY_COLORS} />
                  <span className="text-sm font-mono font-medium text-danger">
                    −{fmt(e.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
