'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { BankAccount } from '@/types'
import { uid } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import { Plus, Trash2, Landmark } from 'lucide-react'

export default function SettingsPage() {
  const { state, dispatch } = useStore()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function addAccount() {
    if (!name.trim()) { setError('Account name is required'); return }
    setError('')
    const account: BankAccount = { id: uid(), name: name.trim() }
    dispatch({ type: 'ADD_BANK_ACCOUNT', payload: account })
    setName('')
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage bank accounts used across Income and Expenses" />

      <div className="card mb-6">
        <h2 className="text-sm font-medium text-ink-primary mb-4">Add bank account</h2>
        {error && (
          <p className="text-xs text-danger mb-3 bg-red-50 px-3 py-2 rounded">{error}</p>
        )}
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="e.g. Meezan Bank Current Account"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAccount()}
          />
          <button className="btn-primary" onClick={addAccount}>
            <Plus className="w-4 h-4" /> Add account
          </button>
        </div>
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
            {state.bankAccounts.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center bg-brand-50 text-brand-700">
                    <Landmark className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-sm text-ink-primary truncate">{b.name}</p>
                </div>
                <button
                  className="btn-danger"
                  onClick={() => dispatch({ type: 'DELETE_BANK_ACCOUNT', payload: b.id })}
                  aria-label="Delete bank account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
