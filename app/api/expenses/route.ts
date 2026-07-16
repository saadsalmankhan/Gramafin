import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { requireUserId } from '@/lib/api-auth'
import { createExpenseForUser } from '@/lib/expenses'
import { EXPENSE_CATEGORIES } from '@/types'
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

  const result = await db.transaction(tx =>
    createExpenseForUser(tx, userId, {
      id: body.id,
      description: body.description,
      amount: body.amount,
      category: body.category,
      date: body.date,
      receiptUrl: typeof body.receiptUrl === 'string' ? body.receiptUrl : null,
      account: typeof body.account === 'string' ? body.account : null,
    })
  )

  // The client's optimistic update only knows about the new expense itself
  // — it can't guess a bank account's new balance without duplicating the
  // matching + sign logic above. Returning the updated row lets the store
  // patch state.bankAccounts with the server-confirmed value instead of
  // leaving it stale until the next full bootstrap (e.g. a hard refresh).
  return NextResponse.json(result, { status: 201 })
}
