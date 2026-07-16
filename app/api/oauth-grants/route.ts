import { NextResponse } from 'next/server'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import { db } from '@/db/client'
import { oauthModelRecords } from '@/db/schema'
import { requireUserId } from '@/lib/api-auth'

// Lists the MCP/OAuth connections (Claude, ChatGPT, etc.) this user has
// approved — read directly from the oidc-provider adapter's own storage
// rather than through the library, since this is purely a display
// concern with no need for oidc-provider's request/response machinery.
export async function GET() {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const grants = await db
    .select()
    .from(oauthModelRecords)
    .where(
      and(
        eq(oauthModelRecords.modelType, 'Grant'),
        eq(oauthModelRecords.userId, userId),
        or(isNull(oauthModelRecords.expiresAt), gt(oauthModelRecords.expiresAt, new Date().toISOString()))
      )
    )

  const clientIds = Array.from(new Set(grants.map(g => (g.payload as { clientId?: string }).clientId).filter(Boolean))) as string[]
  const clients = clientIds.length
    ? await db
        .select()
        .from(oauthModelRecords)
        .where(and(eq(oauthModelRecords.modelType, 'Client'), or(...clientIds.map(id => eq(oauthModelRecords.id, id)))))
    : []
  const clientNameById = new Map(
    clients.map(c => [c.id, (c.payload as { client_name?: string }).client_name || c.id])
  )

  const result = grants.map(g => {
    const payload = g.payload as { clientId?: string; resources?: Record<string, string> }
    const scopes = new Set<string>()
    for (const scopeStr of Object.values(payload.resources ?? {})) {
      for (const s of scopeStr.split(' ')) if (s) scopes.add(s)
    }
    return {
      grantId: g.id,
      clientName: (payload.clientId && clientNameById.get(payload.clientId)) || 'Unknown app',
      scopes: Array.from(scopes),
    }
  })

  return NextResponse.json({ grants: result })
}
