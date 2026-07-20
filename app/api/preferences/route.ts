import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { preferencesFromRow } from '@/db/mappers'
import { requireUserId } from '@/lib/api-auth'
import { CURRENCIES, DEFAULT_PREFERENCES, STOCK_MARKETS } from '@/types'
import { isOneOf } from '@/lib/validate'

export async function PATCH(req: Request) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 })
  }
  if (body.currency !== undefined && !isOneOf(body.currency, CURRENCIES.map((c) => c.code))) {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
  }
  if (body.stockMarket !== undefined && !isOneOf(body.stockMarket, STOCK_MARKETS.map((m) => m.code))) {
    return NextResponse.json({ error: 'Invalid stock market' }, { status: 400 })
  }
  if (body.onboardingDismissed !== undefined && typeof body.onboardingDismissed !== 'boolean') {
    return NextResponse.json({ error: 'Invalid onboardingDismissed' }, { status: 400 })
  }

  const [row] = await db
    .insert(schema.preferences)
    .values({
      userId,
      currency: body.currency ?? DEFAULT_PREFERENCES.currency,
      stockMarket: body.stockMarket ?? DEFAULT_PREFERENCES.stockMarket,
      onboardingDismissed: body.onboardingDismissed ?? DEFAULT_PREFERENCES.onboardingDismissed,
    })
    .onConflictDoUpdate({
      target: schema.preferences.userId,
      set: {
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.stockMarket !== undefined && { stockMarket: body.stockMarket }),
        ...(body.onboardingDismissed !== undefined && { onboardingDismissed: body.onboardingDismissed }),
      },
    })
    .returning()

  return NextResponse.json({ preferences: preferencesFromRow(row) })
}
