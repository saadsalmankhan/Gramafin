import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { oauthModelRecords } from '@/db/schema'
import { requireUserId } from '@/lib/api-auth'
import { DrizzleAdapter } from '@/db/oidcAdapter'

export async function DELETE(_req: Request, { params }: { params: { grantId: string } }) {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  // Confirm this grant actually belongs to the requesting user before
  // revoking anything — grantId alone isn't guaranteed unguessable enough
  // to skip an ownership check.
  const [grant] = await db
    .select({ id: oauthModelRecords.id })
    .from(oauthModelRecords)
    .where(and(eq(oauthModelRecords.modelType, 'Grant'), eq(oauthModelRecords.id, params.grantId), eq(oauthModelRecords.userId, userId)))
    .limit(1)
  if (!grant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // revokeByGrantId deletes every record tagged with this grantId — the
  // grant itself plus any access/refresh tokens issued under it — so a
  // revoke here takes effect immediately rather than waiting for an
  // already-issued access token to expire on its own (up to an hour).
  await new DrizzleAdapter('Grant').revokeByGrantId(params.grantId)

  return NextResponse.json({ ok: true })
}
