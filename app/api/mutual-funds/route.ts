import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { mutualFundFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'
import { MUTUAL_FUND_TYPES } from '@/types'
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
    !isOneOf(body.fundType, MUTUAL_FUND_TYPES) ||
    !isFiniteNumber(body.unitsHeld) ||
    !isFiniteNumber(body.buyNav) ||
    !isFiniteNumber(body.currentNav)
  ) {
    return NextResponse.json({ error: 'Invalid mutual fund' }, { status: 400 })
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.mutualFunds)
      .values({
        userId,
        id: body.id,
        name: body.name,
        fundType: body.fundType,
        unitsHeld: body.unitsHeld,
        buyNav: body.buyNav,
        currentNav: body.currentNav,
        navOverride: isFiniteNumber(body.navOverride) ? body.navOverride : null,
        lastUpdated: typeof body.lastUpdated === 'string' ? body.lastUpdated : null,
        realizedGains: isFiniteNumber(body.realizedGains) ? body.realizedGains : 0,
        notes: typeof body.notes === 'string' ? body.notes : '',
      })
      .returning()

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    return { mutualFund: mutualFundFromRow(row), netWorth }
  })

  return NextResponse.json(result, { status: 201 })
}
