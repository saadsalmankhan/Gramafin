import { randomBytes } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'

type Queryable = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>

export interface ReferralSummary {
  code: string
  sentCount: number
  acceptedCount: number
  points: number
}

const INVITE_POINTS = 10
const SIGNUP_POINTS = 200

function generateCode(): string {
  // 6 random bytes -> 8-char base64url, e.g. "kQ9f2Bxg" — short enough to
  // read out loud, long enough that collisions are a non-issue at this
  // user count (retried on the rare unique-constraint hit regardless).
  return randomBytes(6).toString('base64url')
}

// Existing users predate the referral_code column (nullable — see
// db/schema.ts) and get one generated here on first read rather than via a
// migration backfill script. New users get one set directly at signup
// (lib/auth/users.ts), so this is really only ever exercised once per
// pre-existing account, the first time they load the app after this
// shipped.
export async function ensureReferralCode(tx: Queryable, userId: string): Promise<string> {
  const [user] = await tx.select({ referralCode: schema.users.referralCode }).from(schema.users).where(eq(schema.users.id, userId))
  if (user?.referralCode) return user.referralCode

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    try {
      await tx.update(schema.users).set({ referralCode: code }).where(eq(schema.users.id, userId))
      return code
    } catch (err) {
      // Unique constraint hit — vanishingly unlikely, just retry with a new code.
      if (attempt === 4) throw err
    }
  }
  throw new Error('Failed to generate a unique referral code')
}

// Points are always derived from the two real event counts, never stored
// as a mutable balance — same "recompute, don't incrementally maintain"
// approach as net worth elsewhere in this app, so there's nothing to drift
// out of sync.
export async function getReferralSummary(tx: Queryable, userId: string): Promise<ReferralSummary> {
  const code = await ensureReferralCode(tx, userId)
  const [invites, signups] = await Promise.all([
    tx.select({ email: schema.referralInvites.email }).from(schema.referralInvites).where(eq(schema.referralInvites.userId, userId)),
    tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.referredByUserId, userId)),
  ])

  return {
    code,
    sentCount: invites.length,
    acceptedCount: signups.length,
    points: invites.length * INVITE_POINTS + signups.length * SIGNUP_POINTS,
  }
}

export async function findUserByReferralCode(tx: Queryable, code: string): Promise<{ id: string } | undefined> {
  const [user] = await tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.referralCode, code))
  return user
}

// Called from createUser right after a new account is inserted. Marks the
// specific invite as accepted only when the new signup's email matches one
// the referrer actually sent — a signup via the bare referral link (no
// matching invite row) still credits the referrer through
// referredByUserId alone, just doesn't attribute to one specific invite.
export async function markInviteAccepted(tx: Queryable, referrerUserId: string, newUserEmail: string, newUserId: string): Promise<void> {
  await tx
    .update(schema.referralInvites)
    .set({ acceptedAt: new Date().toISOString(), acceptedUserId: newUserId })
    .where(and(eq(schema.referralInvites.userId, referrerUserId), eq(schema.referralInvites.email, newUserEmail)))
}
