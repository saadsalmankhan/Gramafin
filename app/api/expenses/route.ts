import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { bankAccountFromRow, expenseFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'
import { EXPENSE_CATEGORIES, bankAccountLabel } from '@/types'
import { isFiniteNumber, isIsoDate, isNonEmptyString, isOneOf } from '@/lib/validate'

export async function POST(req: Request) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const body = await req.json().catch(() => null)
  if (
    !body ||
    !isNonEmptyString(body.id) ||
    !isNonEmptyString(body.description) ||
    !isFiniteNumber(body.amount) ||
    !isOneOf(body.category, EXPENSE_CATEGORIES) ||
    !isIsoDate(body.date)
  ) {
    return NextResponse.json({ error: 'Invalid expense' }, { status: 400 })
  }

  const account = typeof body.account === 'string' ? body.account : null

  const result = await db.transaction(async (tx) => {
    // Match the account label to a real bank account, same approach as the
    // recurring-income deposit sweep in lib/income.ts. Unlike that sweep,
    // Credit Card accounts are a valid match target here — an expense is
    // exactly the "charged to a card" case that sweep never has to handle.
    let deductedFromAccountId: string | null = null
    let updatedBankAccount: typeof schema.bankAccounts.$inferSelect | null = null
    if (account) {
      const bankAccountRows = await tx
        .select()
        .from(schema.bankAccounts)
        .where(eq(schema.bankAccounts.userId, userId))
      const matched = bankAccountRows.map(bankAccountFromRow).find(b => bankAccountLabel(b) === account)
      if (matched) {
        deductedFromAccountId = matched.id
        // Credit Card balances use an inverted sign (positive = owed), so a
        // charge increases it; Checking/Saving balances are cash, so a
        // charge decreases it.
        const delta = matched.type === 'Credit Card' ? body.amount : -body.amount
        ;[updatedBankAccount] = await tx
          .update(schema.bankAccounts)
          .set({ startingBalance: matched.startingBalance + delta })
          .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, matched.id)))
          .returning()
      }
    }

    const [row] = await tx
      .insert(schema.expenses)
      .values({
        userId,
        id: body.id,
        description: body.description,
        amount: body.amount,
        category: body.category,
        date: body.date,
        receiptUrl: typeof body.receiptUrl === 'string' ? body.receiptUrl : null,
        account,
        deductedFromAccountId,
      })
      .returning()

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    return {
      expense: expenseFromRow(row),
      // The client's optimistic update only knows about the new expense
      // itself — it can't guess a bank account's new balance without
      // duplicating this route's matching + sign logic. Returning the
      // updated row lets the store patch state.bankAccounts directly with
      // the server-confirmed value instead of leaving it stale until the
      // next full bootstrap (e.g. a hard refresh).
      bankAccount: updatedBankAccount ? bankAccountFromRow(updatedBankAccount) : null,
      netWorth,
    }
  })

  return NextResponse.json(result, { status: 201 })
}
