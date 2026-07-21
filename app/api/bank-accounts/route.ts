import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { requireUserId } from '@/lib/api-auth'
import { createBankAccountForUser } from '@/lib/bankAccounts'
import { BANK_ACCOUNT_TYPES } from '@/types'
import { isFiniteNumber, isNonEmptyString, isOneOf } from '@/lib/validate'

export async function POST(req: Request) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const body = await req.json().catch(() => null)
  if (
    !body ||
    !isNonEmptyString(body.id) ||
    !isNonEmptyString(body.bank) ||
    !isOneOf(body.type, BANK_ACCOUNT_TYPES) ||
    !isFiniteNumber(body.startingBalance)
  ) {
    return NextResponse.json({ error: 'Invalid bank account' }, { status: 400 })
  }

  const result = await db.transaction(tx =>
    createBankAccountForUser(tx, userId, {
      id: body.id,
      bank: body.bank,
      nickname: typeof body.nickname === 'string' ? body.nickname : '',
      type: body.type,
      startingBalance: body.startingBalance,
      dueDate: typeof body.dueDate === 'string' ? body.dueDate : null,
      creditLimit: isFiniteNumber(body.creditLimit) ? body.creditLimit : null,
      minimumPayment: isFiniteNumber(body.minimumPayment) ? body.minimumPayment : null,
    })
  )

  return NextResponse.json(result, { status: 201 })
}
