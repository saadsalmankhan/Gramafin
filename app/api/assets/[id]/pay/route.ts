import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { assetFromRow, bankAccountFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'
import { isFiniteNumber } from '@/lib/validate'

// Pays down an Asset-kind credit card (see components/PayCreditCardModal.tsx).
// Asset-based cards have no "overpaid = credit" convention in their UI
// (always shown as a positive liability), so payments floor at 0 rather than
// going negative — matches the original client-side PAY_CREDIT_CARD reducer.
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
      .from(schema.assets)
      .where(and(eq(schema.assets.userId, userId), eq(schema.assets.id, params.id)))
      .limit(1)
    if (!cardRow) return { error: NextResponse.json({ error: 'Card not found' }, { status: 404 }) }

    let fromAccountRow: typeof schema.bankAccounts.$inferSelect | null = null
    if (fromAccountId) {
      const [row] = await tx
        .select()
        .from(schema.bankAccounts)
        .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, fromAccountId)))
        .limit(1)
      // Ownership check (the fromAccountId must be this user's own account,
      // not guessable/borrowable from another user) and a type check (can't
      // "pay from" another credit card) — both implicit in the old
      // single-blob model, now required explicitly at the API boundary.
      if (!row || row.type === 'Credit Card') {
        return { error: NextResponse.json({ error: 'Invalid source account' }, { status: 400 }) }
      }
      fromAccountRow = row
    }

    const [updatedCard] = await tx
      .update(schema.assets)
      .set({ value: Math.max(0, cardRow.value - body.amount) })
      .where(and(eq(schema.assets.userId, userId), eq(schema.assets.id, params.id)))
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
      asset: assetFromRow(updatedCard),
      bankAccount: updatedFromAccount ? bankAccountFromRow(updatedFromAccount) : null,
      netWorth,
    }
  })

  if ('error' in result) return result.error
  return NextResponse.json(result)
}
