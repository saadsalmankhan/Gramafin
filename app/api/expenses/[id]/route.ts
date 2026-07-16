import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { requireUserId } from '@/lib/api-auth'
import { deleteExpenseForUser } from '@/lib/expenses'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const { deleted: _deleted, ...result } = await db.transaction(tx => deleteExpenseForUser(tx, userId, params.id))
  // See the POST route for why bankAccount is returned — same client-side
  // reconciliation need.
  return NextResponse.json(result)
}
