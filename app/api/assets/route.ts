import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { assetFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'
import { ASSET_CATEGORIES } from '@/types'
import { isFiniteNumber, isNonEmptyString, isOneOf } from '@/lib/validate'

export async function POST(req: Request) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const body = await req.json().catch(() => null)
  if (
    !body ||
    !isNonEmptyString(body.id) ||
    !isNonEmptyString(body.name) ||
    !isFiniteNumber(body.value) ||
    !isOneOf(body.category, ASSET_CATEGORIES)
  ) {
    return NextResponse.json({ error: 'Invalid asset' }, { status: 400 })
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.assets)
      .values({
        userId,
        id: body.id,
        name: body.name,
        value: body.value,
        category: body.category,
        creditLimit: isFiniteNumber(body.creditLimit) ? body.creditLimit : null,
        dueDate: typeof body.dueDate === 'string' ? body.dueDate : null,
        minimumPayment: isFiniteNumber(body.minimumPayment) ? body.minimumPayment : null,
      })
      .returning()

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    return { asset: assetFromRow(row), netWorth }
  })

  return NextResponse.json(result, { status: 201 })
}
