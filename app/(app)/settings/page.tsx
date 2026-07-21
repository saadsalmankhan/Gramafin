'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import {
  BankAccount,
  BankAccountType,
  BANK_ACCOUNT_TYPES,
  PAKISTANI_BANKS,
  bankAccountLabel,
  CURRENCIES,
  STOCK_MARKETS,
  CurrencyCode,
  StockMarketCode,
} from '@/types'
import { fmt, uid, daysUntil } from '@/lib/utils'
import { computeNetWorth } from '@/lib/networth'
import { useTheme } from '@/lib/theme'
import PageHeader from '@/components/PageHeader'
import NetWorthContribution from '@/components/NetWorthContribution'
import ConfirmDialog from '@/components/ConfirmDialog'
import PayCreditCardModal from '@/components/PayCreditCardModal'
import ConnectedAppsSection from '@/components/ConnectedAppsSection'
import ReferralsSection from '@/components/ReferralsSection'
import TourHighlight from '@/components/TourHighlight'
import EntityLogo from '@/components/EntityLogo'
import { bankLogo } from '@/lib/entityLogo'
import { Plus, Trash2, Moon, Sun, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

type Tab = 'accounts' | 'preferences' | 'connected' | 'referrals'

function utilizationColor(p: number): string {
  return p < 70 ? '#15803d' : p < 90 ? '#d97706' : '#dc2626'
}

export default function SettingsPage() {
  const { state, addBankAccount, deleteBankAccount, payBankAccountCard, setPreferences } = useStore()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams?.get('tab')
    return t === 'referrals' || t === 'preferences' || t === 'connected' ? t : 'accounts'
  })
  const [bank, setBank] = useState(PAKISTANI_BANKS[0])
  const [nickname, setNickname] = useState('')
  const [type, setType] = useState<BankAccountType>('Checking')
  const [startingBalance, setStartingBalance] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [minimumPayment, setMinimumPayment] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null)
  const [payTarget, setPayTarget] = useState<BankAccount | null>(null)
  const { theme, toggle: toggleTheme } = useTheme()

  const netWorthBreakdown = computeNetWorth(state)
  const isCreditCardForm = type === 'Credit Card'

  function addAccount() {
    const balance = parseFloat(startingBalance)
    if (startingBalance.trim() && isNaN(balance)) { setError('Enter a valid starting balance'); return }
    setError('')
    const limit = parseFloat(creditLimit)
    const minPayment = parseFloat(minimumPayment)
    const account: BankAccount = {
      id: uid(),
      bank,
      nickname: nickname.trim(),
      type,
      startingBalance: isNaN(balance) ? 0 : balance,
      ...(isCreditCardForm && dueDate && { dueDate }),
      ...(isCreditCardForm && !isNaN(limit) && limit > 0 && { creditLimit: limit }),
      ...(isCreditCardForm && !isNaN(minPayment) && minPayment > 0 && { minimumPayment: minPayment }),
    }
    addBankAccount(account)
    setBank(PAKISTANI_BANKS[0])
    setNickname('')
    setType('Checking')
    setStartingBalance('')
    setDueDate('')
    setCreditLimit('')
    setMinimumPayment('')
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Bank accounts and app preferences" />

      <div className="flex rounded-lg border border-gray-200 dark:border-white/10 p-0.5 w-fit mb-6">
        {([
          { key: 'accounts', label: 'Accounts' },
          { key: 'preferences', label: 'Preferences' },
          { key: 'referrals', label: 'Invite friends' },
          { key: 'connected', label: 'Connected apps' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'px-4 py-1.5 text-sm rounded-md transition-colors',
              tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-secondary hover:bg-surface-0'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'accounts' && (
        <>
          <NetWorthContribution
            label="Bank accounts"
            amount={netWorthBreakdown.bankAccounts}
            netWorth={netWorthBreakdown.netWorth}
          />

          <TourHighlight label="Add your bank account here">
          <div className="card mb-6">
            <h2 className="text-sm font-medium text-ink-primary mb-4">Add bank account</h2>
            {error && (
              <p className="text-xs text-danger mb-3 bg-red-50 dark:bg-danger/10 px-3 py-2 rounded">{error}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <select className="select" value={bank} onChange={e => setBank(e.target.value)}>
                {PAKISTANI_BANKS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Nickname (optional, e.g. Salary account)"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAccount()}
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              <select
                className="select flex-1"
                value={type}
                onChange={e => setType(e.target.value as BankAccountType)}
              >
                {BANK_ACCOUNT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                className="input flex-1 font-mono"
                type="number"
                placeholder="Starting balance (PKR)"
                value={startingBalance}
                onChange={e => setStartingBalance(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAccount()}
              />
              <button className="btn-primary" onClick={addAccount}>
                <Plus className="w-4 h-4" /> Add account
              </button>
            </div>
            {isCreditCardForm && (
              <>
                <div className="flex gap-3 flex-wrap mt-3">
                  <input
                    className="input flex-1 min-w-40"
                    type="date"
                    placeholder="Payment due date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                  />
                  <input
                    className="input flex-1 min-w-40 font-mono"
                    type="number"
                    placeholder="Credit limit (PKR, optional)"
                    value={creditLimit}
                    onChange={e => setCreditLimit(e.target.value)}
                  />
                  <input
                    className="input flex-1 min-w-40 font-mono"
                    type="number"
                    placeholder="Minimum payment (PKR, optional)"
                    value={minimumPayment}
                    onChange={e => setMinimumPayment(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-ink-muted mt-3">
                  For credit cards, a positive balance means you owe that amount (shown in red).
                  Enter a negative number (e.g. −100) if you've overpaid and the card owes you money instead.
                  Set a due date to get a payment reminder on the Dashboard. A credit limit adds a
                  utilization bar to the account below.
                </p>
              </>
            )}
          </div>
          </TourHighlight>

          <div className="card">
            <h2 className="text-sm font-medium text-ink-primary mb-4">
              Bank accounts
              <span className="ml-2 text-ink-muted font-normal">({state.bankAccounts.length})</span>
            </h2>

            {state.bankAccounts.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-10">
                No bank accounts yet — "Cash" is always available by default
              </p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {state.bankAccounts.map(b => {
                  const isCreditCard = b.type === 'Credit Card'
                  const balance = b.startingBalance ?? 0
                  // Credit cards invert the usual sign: owing money (positive) reads
                  // as debt; a negative entry means the card owes the user instead
                  // (they overpaid), so it displays as a positive credit.
                  const isDebt = isCreditCard ? balance > 0 : balance < 0
                  // Sign carries direction via an explicit prefix, not color — same
                  // convention as the expense/income tables (text stays ink-primary).
                  const displayText = `${isDebt ? '−' : '+'}${fmt(Math.abs(balance))}`
                  const limit = b.creditLimit ?? 0
                  const utilization = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 0
                  return (
                    <div key={b.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <EntityLogo {...bankLogo(b.bank)} />
                          <div className="min-w-0">
                            <p className="text-sm text-ink-primary truncate">{bankAccountLabel(b)}</p>
                            <p className="text-[11px] text-ink-muted">
                              {b.bank} · {b.type}
                              {isCreditCard && b.minimumPayment ? ` · Min payment ${fmt(b.minimumPayment)}` : ''}
                              {isCreditCard && b.dueDate && (() => {
                                const d = daysUntil(b.dueDate)
                                const label = d < 0 ? `Overdue ${Math.abs(d)}d` : d === 0 ? 'Due today' : `Due in ${d}d`
                                return (
                                  <span className={clsx('ml-1 font-medium', d <= 3 ? 'text-danger' : d <= 7 ? 'text-warning' : 'text-ink-muted')}>
                                    · {label}
                                  </span>
                                )
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {isCreditCard && limit > 0 && (
                            <div className="w-24 hidden sm:block">
                              <div className="h-1.5 bg-surface-1 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${utilization}%`, background: utilizationColor(utilization) }} />
                              </div>
                              <p className="text-[10px] mt-0.5 text-right font-medium" style={{ color: utilizationColor(utilization) }}>
                                {utilization}% used
                              </p>
                            </div>
                          )}
                          <span
                            className={clsx(
                              'text-sm font-mono font-medium tabular-nums',
                              isDebt ? 'text-ink-primary' : 'text-success'
                            )}
                          >
                            {displayText}
                            {isCreditCard && balance < 0 && ' credit'}
                          </span>
                          {isCreditCard && isDebt && (
                            <button
                              className="btn-ghost h-8 px-2.5 text-xs"
                              onClick={() => setPayTarget(b)}
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Pay
                            </button>
                          )}
                          <button
                            className="btn-danger"
                            onClick={() => setDeleteTarget(b)}
                            aria-label="Delete bank account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'preferences' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-sm font-medium text-ink-primary mb-1">Appearance</h2>
            <p className="text-xs text-ink-muted mb-4">Applies to this device — it doesn't follow you to other devices.</p>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                  {theme === 'dark' ? <Moon className="w-4 h-4 text-brand-700" /> : <Sun className="w-4 h-4 text-brand-700" />}
                </div>
                <div>
                  <p className="text-sm text-ink-primary">Dark mode</p>
                  <p className="text-[11px] text-ink-muted">{theme === 'dark' ? 'On' : 'Off'} — defaults to your system setting</p>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={theme === 'dark'}
                aria-label="Toggle dark mode"
                onClick={toggleTheme}
                className={clsx(
                  'relative h-6 w-11 rounded-full transition-colors flex-shrink-0',
                  theme === 'dark' ? 'bg-brand-600' : 'bg-gray-200 dark:bg-white/10'
                )}
              >
                <span
                  className={clsx(
                    'absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-medium text-ink-primary mb-1">Currency</h2>
            <p className="text-xs text-ink-muted mb-4">
              Changes the symbol shown throughout the app. Amounts you've already entered aren't converted —
              this relabels the display only.
            </p>
            <select
              className="select w-full sm:w-80"
              value={state.preferences.currency}
              onChange={e => setPreferences({ currency: e.target.value as CurrencyCode })}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="card">
            <h2 className="text-sm font-medium text-ink-primary mb-1">Stock market</h2>
            <p className="text-xs text-ink-muted mb-4">
              Which market the Investments page searches for live stock prices.
            </p>
            <select
              className="select w-full sm:w-80"
              value={state.preferences.stockMarket}
              onChange={e => setPreferences({ stockMarket: e.target.value as StockMarketCode })}
            >
              {STOCK_MARKETS.map(m => (
                <option key={m.code} value={m.code} disabled={!m.available}>
                  {m.label}{!m.available ? ' — coming soon' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {tab === 'referrals' && <ReferralsSection />}

      {tab === 'connected' && <ConnectedAppsSection />}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget ? bankAccountLabel(deleteTarget) : ''}"?`}
        message="This will remove the account and its balance from your net worth. Any expenses or income already logged against it will keep the account's name as plain text. This can't be undone."
        onConfirm={() => {
          if (deleteTarget) deleteBankAccount(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PayCreditCardModal
        open={payTarget !== null}
        cardLabel={payTarget ? bankAccountLabel(payTarget) : ''}
        balanceOwed={payTarget ? Math.max(0, payTarget.startingBalance) : 0}
        payFromOptions={state.bankAccounts.filter(b => b.type !== 'Credit Card')}
        onConfirm={(amount, fromAccountId) => {
          if (payTarget) {
            payBankAccountCard(payTarget.id, amount, fromAccountId)
          }
          setPayTarget(null)
        }}
        onCancel={() => setPayTarget(null)}
      />
    </div>
  )
}
