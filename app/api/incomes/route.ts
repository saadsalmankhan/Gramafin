import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { incomeFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'
import { INCOME_CATEGORIES } from '@/types'
import { isFiniteNumber, isIsoDate, isNonEmptyString, isOneOf } from '@/lib/validate'

// Manual one-off income entries only — entries generated from a
// RecurringIncome are created server-side by the catch-up sweep (see
// lib/recurring-sweep.ts), never posted here directly.
export async function POST(req: Request) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const body = await req.json().catch(() => null)
  if (
    !body ||
    !isNonEmptyString(body.id) ||
    !isNonEmptyString(body.source) ||
    !isOneOf(body.category, INCOME_CATEGORIES) ||
    !isFiniteNumber(body.amount) ||
    !isNonEmptyString(body.account) ||
    !isIsoDate(body.date)
  ) {
    return NextResponse.json({ error: 'Invalid income' }, { status: 400 })
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.incomes)
      .values({
        userId,
        id: body.id,
        source: body.source,
        category: body.category,
        amount: body.amount,
        account: body.account,
        date: body.date,
        recurringId: null,
        depositedToAccountId: null,
      })
      .returning()

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    return { income: incomeFromRow(row), netWorth }
  })

  return NextResponse.json(result, { status: 201 })
}
