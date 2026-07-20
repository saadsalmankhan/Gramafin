import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/options'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { requireUserId } from '@/lib/api-auth'
import { getReferralSummary } from '@/lib/referrals'
import { sendReferralInviteEmail } from '@/lib/email'
import { isValidEmail } from '@/lib/validate'
import { referralInviteRatelimit } from '@/lib/ratelimit'

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function POST(req: Request) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const { success } = await referralInviteRatelimit.limit(`referral-invite:${userId}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many invites sent — try again later' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  if (email === session?.user?.email?.toLowerCase()) {
    return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 })
  }

  const summary = await getReferralSummary(db, userId)

  // Dedupe on (user_id, email) — re-inviting the same address is a no-op,
  // not a fresh 10-point invite. Still re-sends the email (a reasonable
  // "resend my invite" action), just doesn't insert a second row or
  // double-count points.
  const [existing] = await db
    .select({ email: schema.referralInvites.email })
    .from(schema.referralInvites)
    .where(and(eq(schema.referralInvites.userId, userId), eq(schema.referralInvites.email, email)))

  if (!existing) {
    await db.insert(schema.referralInvites).values({ userId, email })
  }

  const referralUrl = `${APP_URL}/signup?ref=${summary.code}`
  try {
    await sendReferralInviteEmail({ to: email, inviterName: session?.user?.name || 'A Gramafin user', referralUrl })
  } catch (err) {
    console.error('Failed to send referral invite email:', err)
    // The invite row (and its points) still stand even if the email
    // provider hiccups — the referral link works regardless of whether
    // this specific email arrives, so don't roll it back over a send failure.
  }

  const updatedSummary = await getReferralSummary(db, userId)
  return NextResponse.json({ summary: updatedSummary })
}
