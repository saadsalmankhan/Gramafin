import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { investmentFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'
import { INVESTMENT_TYPES } from '@/types'
import { isFiniteNumber, isNonEmptyString, isOneOf } from '@/lib/validate'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const body = await req.json().catch(() => null)
  if (
    !body ||
    !isNonEmptyString(body.name) ||
    !isOneOf(body.type, INVESTMENT_TYPES) ||
    !isFiniteNumber(body.amountInvested) ||
    !isFiniteNumber(body.currentValue)
  ) {
    return NextResponse.json({ error: 'Invalid investment' }, { status: 400 })
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(schema.investments)
      .set({
        name: body.name,
        type: body.type,
        amountInvested: body.amountInvested,
        currentValue: body.currentValue,
        symbol: typeof body.symbol === 'string' ? body.symbol : null,
        sharesHeld: isFiniteNumber(body.sharesHeld) ? body.sharesHeld : null,
        buyPrice: isFiniteNumber(body.buyPrice) ? body.buyPrice : null,
        priceOverride: isFiniteNumber(body.priceOverride) ? body.priceOverride : null,
        lastPriceUpdate: typeof body.lastPriceUpdate === 'string' ? body.lastPriceUpdate : null,
      })
      .where(and(eq(schema.investments.userId, userId), eq(schema.investments.id, params.id)))
      .returning()
    if (!row) return { error: NextResponse.json({ error: 'Investment not found' }, { status: 404 }) }

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    return { investment: investmentFromRow(row), netWorth }
  })

  if ('error' in result) return result.error
  return NextResponse.json(result)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const result = await db.transaction(async (tx) => {
    await tx
      .delete(schema.investments)
      .where(and(eq(schema.investments.userId, userId), eq(schema.investments.id, params.id)))

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    return { netWorth }
  })

  return NextResponse.json(result)
}
