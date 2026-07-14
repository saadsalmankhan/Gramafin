import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { expenseFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'
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

  const result = await db.transaction(async (tx) => {
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
        account: typeof body.account === 'string' ? body.account : null,
      })
      .returning()

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    return { expense: expenseFromRow(row), netWorth }
  })

  return NextResponse.json(result, { status: 201 })
}
