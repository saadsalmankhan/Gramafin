import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { runRecurringIncomeSweep } from '@/lib/recurring-sweep'
import { requireUserId } from '@/lib/api-auth'
import { INCOME_CATEGORIES, INCOME_FREQUENCIES } from '@/types'
import { isFiniteNumber, isIsoDate, isNonEmptyString, isOneOf } from '@/lib/validate'

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
    !isOneOf(body.frequency, INCOME_FREQUENCIES) ||
    !isIsoDate(body.nextDate)
  ) {
    return NextResponse.json({ error: 'Invalid recurring income' }, { status: 400 })
  }

  const result = await db.transaction(async (tx) => {
    await tx.insert(schema.recurringIncomes).values({
      userId,
      id: body.id,
      source: body.source,
      category: body.category,
      amount: body.amount,
      account: body.account,
      frequency: body.frequency,
      nextDate: body.nextDate,
    })

    // A freshly-added rule whose nextDate is already in the past should
    // generate its catch-up entries immediately, matching the old client
    // reducer's ADD_RECURRING_INCOME behavior (it ran applyDueIncome right
    // away rather than waiting for the next page load).
    const sweep = await runRecurringIncomeSweep(tx, userId)
    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)

    return {
      recurringIncome: sweep.recurring.find((r) => r.id === body.id)!,
      incomes: sweep.incomes,
      bankAccounts: sweep.bankAccounts,
      netWorth,
    }
  })

  return NextResponse.json(result, { status: 201 })
}
