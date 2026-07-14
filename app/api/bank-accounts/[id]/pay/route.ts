import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { bankAccountFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'
import { isFiniteNumber } from '@/lib/validate'

// Pays down a BankAccount-kind credit card. These already use "negative
// balance = credit" as their documented convention (see Settings), so the
// result can go negative — unlike the Asset-kind /api/assets/:id/pay, which
// floors at 0. Matches the original client-side PAY_CREDIT_CARD reducer.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const body = await req.json().catch(() => null)
  if (!body || !isFiniteNumber(body.amount) || body.amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }
  const fromAccountId: string | null = typeof body.fromAccountId === 'string' ? body.fromAccountId : null

  const result = await db.transaction(async (tx) => {
    const [cardRow] = await tx
      .select()
      .from(schema.bankAccounts)
      .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, params.id)))
      .limit(1)
    if (!cardRow || cardRow.type !== 'Credit Card') {
      return { error: NextResponse.json({ error: 'Card not found' }, { status: 404 }) }
    }

    let fromAccountRow: typeof schema.bankAccounts.$inferSelect | null = null
    if (fromAccountId) {
      const [row] = await tx
        .select()
        .from(schema.bankAccounts)
        .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, fromAccountId)))
        .limit(1)
      // Ownership + type check, same rationale as /api/assets/:id/pay — this
      // also rules out paying a card from itself, since the target above is
      // already confirmed to be a Credit Card and this rejects any source
      // that is one too.
      if (!row || row.type === 'Credit Card') {
        return { error: NextResponse.json({ error: 'Invalid source account' }, { status: 400 }) }
      }
      fromAccountRow = row
    }

    const [updatedCard] = await tx
      .update(schema.bankAccounts)
      .set({ startingBalance: cardRow.startingBalance - body.amount })
      .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, params.id)))
      .returning()

    let updatedFromAccount: typeof schema.bankAccounts.$inferSelect | null = null
    if (fromAccountRow) {
      ;[updatedFromAccount] = await tx
        .update(schema.bankAccounts)
        .set({ startingBalance: fromAccountRow.startingBalance - body.amount })
        .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, fromAccountRow.id)))
        .returning()
    }

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    return {
      bankAccount: bankAccountFromRow(updatedCard),
      fromAccount: updatedFromAccount ? bankAccountFromRow(updatedFromAccount) : null,
      netWorth,
    }
  })

  if ('error' in result) return result.error
  return NextResponse.json(result)
}
