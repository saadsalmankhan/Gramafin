import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'
import { EXPENSE_CATEGORIES } from '@/types'
import { isFiniteNumber, isOneOf } from '@/lib/validate'

export async function PUT(req: Request, { params }: { params: { category: string } }) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const category = decodeURIComponent(params.category)
  if (!isOneOf(category, EXPENSE_CATEGORIES)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  if (!body || !isFiniteNumber(body.amount)) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const result = await db.transaction(async (tx) => {
    // Every user's 8 categories are seeded at signup (see createUser), but
    // onConflictDoUpdate keeps this correct even for pre-migration users
    // whose row set might not perfectly match.
    await tx
      .insert(schema.budgetLimits)
      .values({ userId, category, amount: body.amount })
      .onConflictDoUpdate({
        target: [schema.budgetLimits.userId, schema.budgetLimits.category],
        set: { amount: body.amount },
      })

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    return { category, amount: body.amount, netWorth }
  })

  return NextResponse.json(result)
}
