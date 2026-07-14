import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const result = await db.transaction(async (tx) => {
    // incomes.deposited_to_account_id is ON DELETE SET NULL — any income
    // previously deposited into this account falls back to being counted via
    // netSavings again (see the schema comment; this fixes a latent bug the
    // old Redis blob had no way to fix: a deleted account used to leave that
    // income permanently excluded from net worth).
    await tx
      .delete(schema.bankAccounts)
      .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, params.id)))

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    return { netWorth }
  })

  return NextResponse.json(result)
}
