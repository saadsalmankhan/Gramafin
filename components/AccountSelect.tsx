'use client'

import { BankAccount } from '@/types'

const ADD_NEW = '__add_new_account__'

interface Props {
  value: string
  onChange: (value: string) => void
  bankAccounts: BankAccount[]
  className?: string
}

export default function AccountSelect({ value, onChange, bankAccounts, className }: Props) {
  return (
    <select
      className={className ?? 'select'}
      value={value}
      onChange={e => {
        if (e.target.value === ADD_NEW) {
          window.open('/settings', '_blank')
          return
        }
        onChange(e.target.value)
      }}
    >
      <option value="Cash">Cash</option>
      {bankAccounts.map(b => (
        <option key={b.id} value={b.name}>{b.name}</option>
      ))}
      <option value={ADD_NEW}>+ Add new account</option>
    </select>
  )
}
