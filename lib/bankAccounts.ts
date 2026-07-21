import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { bankAccountFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import type { BankAccountType } from '@/types'

type Queryable = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>

// Shared between the REST route (app/api/bank-accounts/route.ts) and the
// MCP add_bank_account/add_credit_card tools — same reasoning as
// lib/expenses.ts: one insert path, so a future change can't drift between
// the two callers.
export async function createBankAccountForUser(
  tx: Queryable,
  userId: string,
  params: {
    id: string
    bank: string
    nickname?: string
    type: BankAccountType
    startingBalance: number
    dueDate?: string | null
    creditLimit?: number | null
    minimumPayment?: number | null
  }
) {
  const [row] = await tx
    .insert(schema.bankAccounts)
    .values({
      userId,
      id: params.id,
      bank: params.bank,
      nickname: params.nickname ?? '',
      type: params.type,
      startingBalance: params.startingBalance,
      dueDate: params.dueDate ?? null,
      creditLimit: params.creditLimit ?? null,
      minimumPayment: params.minimumPayment ?? null,
    })
    .returning()

  const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
  return { bankAccount: bankAccountFromRow(row), netWorth }
}
