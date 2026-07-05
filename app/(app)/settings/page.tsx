'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { BankAccount, BankAccountType, BANK_ACCOUNT_TYPES, PAKISTANI_BANKS, bankAccountLabel } from '@/types'
import { fmt, uid, daysUntil } from '@/lib/utils'
import { computeNetWorth } from '@/lib/networth'
import PageHeader from '@/components/PageHeader'
import NetWorthContribution from '@/components/NetWorthContribution'
import { Plus, Trash2, Landmark, CreditCard } from 'lucide-react'
import clsx from 'clsx'

export default function SettingsPage() {
  const { state, dispatch } = useStore()
  const [bank, setBank] = useState(PAKISTANI_BANKS[0])
  const [nickname, setNickname] = useState('')
  const [type, setType] = useState<BankAccountType>('Checking')
  const [startingBalance, setStartingBalance] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')

  const netWorthBreakdown = computeNetWorth(state)
  const isCreditCardForm = type === 'Credit Card'

  function addAccount() {
    const balance = parseFloat(startingBalance)
    if (startingBalance.trim() && isNaN(balance)) { setError('Enter a valid starting balance'); return }
    setError('')
    const account: BankAccount = {
      id: uid(),
      bank,
      nickname: nickname.trim(),
      type,
      startingBalance: isNaN(balance) ? 0 : balance,
      ...(isCreditCardForm && dueDate && { dueDate }),
    }
    dispatch({ type: 'ADD_BANK_ACCOUNT', payload: account })
    setBank(PAKISTANI_BANKS[0])
    setNickname('')
    setType('Checking')
    setStartingBalance('')
    setDueDate('')
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage bank accounts used across Income and Expenses" />

      <NetWorthContribution
        label="Bank accounts"
        amount={netWorthBreakdown.bankAccounts}
        netWorth={netWorthBreakdown.netWorth}
      />

      <div className="card mb-6">
        <h2 className="text-sm font-medium text-ink-primary mb-4">Add bank account</h2>
        {error && (
          <p className="text-xs text-danger mb-3 bg-red-50 px-3 py-2 rounded">{error}</p>
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
            </div>
            <p className="text-[11px] text-ink-muted mt-3">
              For credit cards, a positive balance means you owe that amount (shown in red).
              Enter a negative number (e.g. −100) if you've overpaid and the card owes you money instead.
              Set a due date to get a payment reminder on the Dashboard.
            </p>
          </>
        )}
      </div>

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
          <div className="divide-y divide-gray-50">
            {state.bankAccounts.map(b => {
              const isCreditCard = b.type === 'Credit Card'
              const balance = b.startingBalance ?? 0
              // Credit cards invert the usual sign: owing money (positive) reads
              // as debt (red); a negative entry means the card owes the user
              // instead (they overpaid), so it displays as a positive credit.
              // fmt() already renders a leading "-" for negative numbers, so
              // credit cards use Math.abs to avoid double-signing the debt case.
              const displayText = isCreditCard ? fmt(Math.abs(balance)) : fmt(balance)
              const isDebt = isCreditCard ? balance > 0 : balance < 0
              return (
                <div key={b.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center bg-brand-50 text-brand-700">
                      {isCreditCard ? <CreditCard className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-ink-primary truncate">{bankAccountLabel(b)}</p>
                      <p className="text-[11px] text-ink-muted">
                        {b.bank} · {b.type}
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
                    <span
                      className={clsx(
                        'text-sm font-mono font-medium',
                        isDebt ? 'text-danger' : 'text-success'
                      )}
                    >
                      {displayText}
                      {isCreditCard && balance < 0 && ' credit'}
                    </span>
                    <button
                      className="btn-danger"
                      onClick={() => dispatch({ type: 'DELETE_BANK_ACCOUNT', payload: b.id })}
                      aria-label="Delete bank account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
