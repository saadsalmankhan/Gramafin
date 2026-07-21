import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { requireUserId } from '@/lib/api-auth'
import { LEGAL_VERSIONS } from '@/lib/legalVersions'

// Records the cookie banner's outcome for a logged-in user. Terms/privacy
// acceptance is recorded separately at signup (see lib/auth/users.ts) since
// that's the only point every user actually passes through — this route is
// cookie-only, hit whenever the banner is shown and answered, which can
// happen again later on a new device even for an existing account.
export async function POST(req: Request) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const body = await req.json().catch(() => null)
  const choice = body?.choice
  if (choice !== 'accepted' && choice !== 'rejected') {
    return NextResponse.json({ error: 'Invalid choice' }, { status: 400 })
  }

  await db
    .insert(schema.legalAcceptances)
    .values({
      userId,
      cookiePolicyVersion: LEGAL_VERSIONS.cookies,
      cookiePolicyChoice: choice,
      cookiePolicyAcceptedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: schema.legalAcceptances.userId,
      set: {
        cookiePolicyVersion: LEGAL_VERSIONS.cookies,
        cookiePolicyChoice: choice,
        cookiePolicyAcceptedAt: new Date().toISOString(),
      },
    })

  return NextResponse.json({ ok: true })
}
