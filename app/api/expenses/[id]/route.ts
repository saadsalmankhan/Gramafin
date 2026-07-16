import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { bankAccountFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const result = await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(schema.expenses)
      .where(and(eq(schema.expenses.userId, userId), eq(schema.expenses.id, params.id)))
      .returning()

    // Reverse the balance change this expense made when it was added — same
    // sign logic as the POST route, inverted. If the linked account was
    // itself deleted since, deductedFromAccountId is already null (the FK's
    // ON DELETE SET NULL), so there's nothing to reverse into.
    let updatedBankAccount: typeof schema.bankAccounts.$inferSelect | null = null
    if (deleted?.deductedFromAccountId) {
      const [account] = await tx
        .select()
        .from(schema.bankAccounts)
        .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, deleted.deductedFromAccountId)))
        .limit(1)
      if (account) {
        const delta = account.type === 'Credit Card' ? -deleted.amount : deleted.amount
        ;[updatedBankAccount] = await tx
          .update(schema.bankAccounts)
          .set({ startingBalance: account.startingBalance + delta })
          .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, account.id)))
          .returning()
      }
    }

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    // See the POST route for why this is returned — same client-side
    // reconciliation need.
    return { bankAccount: updatedBankAccount ? bankAccountFromRow(updatedBankAccount) : null, netWorth }
  })

  return NextResponse.json(result)
}
