'use client'

import { useEffect, useState } from 'react'
import { BankAccount, bankAccountLabel } from '@/types'
import { fmt } from '@/lib/utils'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  cardLabel: string
  balanceOwed: number
  payFromOptions: BankAccount[]
  onConfirm: (amount: number, fromAccountId: string | null) => void
  onCancel: () => void
}

export default function PayCreditCardModal({
  open, cardLabel, balanceOwed, payFromOptions, onConfirm, onCancel,
}: Props) {
  const [amount, setAmount] = useState('')
  const [fromAccountId, setFromAccountId] = useState<string>('cash')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setAmount(balanceOwed > 0 ? String(balanceOwed) : '')
      setFromAccountId('cash')
      setError('')
    }
  }, [open, balanceOwed])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  function submit() {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid payment amount'); return }
    onConfirm(amt, fromAccountId === 'cash' ? null : fromAccountId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-sm font-medium text-ink-primary">Pay &ldquo;{cardLabel}&rdquo;</h2>
          <button className="text-ink-muted hover:text-ink-primary transition-colors" onClick={onCancel} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-ink-muted mb-4">
          Current balance owed: <span className="font-mono text-ink-primary">{fmt(balanceOwed)}</span>
        </p>

        {error && <p className="text-xs text-danger mb-3 bg-red-50 dark:bg-danger/10 px-3 py-2 rounded">{error}</p>}

        <label className="block mb-3">
          <span className="text-xs text-ink-muted mb-1 block">Payment amount (PKR)</span>
          <input
            className="input w-full font-mono"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            autoFocus
          />
        </label>

        <label className="block mb-5">
          <span className="text-xs text-ink-muted mb-1 block">Pay from</span>
          <select className="select w-full" value={fromAccountId} onChange={e => setFromAccountId(e.target.value)}>
            <option value="cash">Cash (not tracked as a balance)</option>
            {payFromOptions.map(b => (
              <option key={b.id} value={b.id}>{bankAccountLabel(b)}</option>
            ))}
          </select>
          <span className="text-[11px] text-ink-muted mt-1 block">
            {fromAccountId === 'cash'
              ? "Reduces the card's balance only — no other account is tracked for cash."
              : "Also deducts this amount from the selected account's balance."}
          </span>
        </label>

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Confirm payment</button>
        </div>
      </div>
    </div>
  )
}
