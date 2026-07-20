import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { requireUserId } from '@/lib/api-auth'
import { getReferralSummary } from '@/lib/referrals'

export async function GET() {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const [summary, invites] = await Promise.all([
    getReferralSummary(db, userId),
    db
      .select({ email: schema.referralInvites.email, invitedAt: schema.referralInvites.invitedAt, acceptedAt: schema.referralInvites.acceptedAt })
      .from(schema.referralInvites)
      .where(eq(schema.referralInvites.userId, userId))
      .orderBy(desc(schema.referralInvites.invitedAt)),
  ])

  return NextResponse.json({ summary, invites })
}
