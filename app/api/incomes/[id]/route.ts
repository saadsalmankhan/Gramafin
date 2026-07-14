import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { requireUserId } from '@/lib/api-auth'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const result = await db.transaction(async (tx) => {
    await tx
      .delete(schema.incomes)
      .where(and(eq(schema.incomes.userId, userId), eq(schema.incomes.id, params.id)))

    const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
    return { netWorth }
  })

  return NextResponse.json(result)
}
