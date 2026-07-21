import { and, eq, isNotNull, lt } from 'drizzle-orm'
import { db } from './client'
import { oauthModelRecords } from './schema'

// A generic Postgres-backed Adapter for oidc-provider (the MCP OAuth
// authorization server) — see the comment above the oauth_model_records
// table in db/schema.ts for why one table serves every model. This
// implements the exact interface oidc-provider requires:
// https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#adapter
export class DrizzleAdapter {
  private modelType: string

  constructor(name: string) {
    this.modelType = name
  }

  async upsert(id: string, payload: Record<string, unknown>, expiresIn?: number) {
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null
    await db
      .insert(oauthModelRecords)
      .values({
        modelType: this.modelType,
        id,
        payload,
        userId: typeof payload.accountId === 'string' ? payload.accountId : null,
        grantId: typeof payload.grantId === 'string' ? payload.grantId : null,
        userCode: typeof payload.userCode === 'string' ? payload.userCode : null,
        uid: typeof payload.uid === 'string' ? payload.uid : null,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [oauthModelRecords.modelType, oauthModelRecords.id],
        set: {
          payload,
          userId: typeof payload.accountId === 'string' ? payload.accountId : null,
          grantId: typeof payload.grantId === 'string' ? payload.grantId : null,
          userCode: typeof payload.userCode === 'string' ? payload.userCode : null,
          uid: typeof payload.uid === 'string' ? payload.uid : null,
          expiresAt,
        },
      })
  }

  async find(id: string) {
    const [row] = await db
      .select()
      .from(oauthModelRecords)
      .where(and(eq(oauthModelRecords.modelType, this.modelType), eq(oauthModelRecords.id, id)))
      .limit(1)
    return rowToPayload(row)
  }

  async findByUserCode(userCode: string) {
    const [row] = await db
      .select()
      .from(oauthModelRecords)
      .where(and(eq(oauthModelRecords.modelType, this.modelType), eq(oauthModelRecords.userCode, userCode)))
      .limit(1)
    return rowToPayload(row)
  }

  async findByUid(uid: string) {
    const [row] = await db
      .select()
      .from(oauthModelRecords)
      .where(and(eq(oauthModelRecords.modelType, this.modelType), eq(oauthModelRecords.uid, uid)))
      .limit(1)
    return rowToPayload(row)
  }

  async consume(id: string) {
    await db
      .update(oauthModelRecords)
      .set({ consumedAt: new Date().toISOString() })
      .where(and(eq(oauthModelRecords.modelType, this.modelType), eq(oauthModelRecords.id, id)))
  }

  async destroy(id: string) {
    await db
      .delete(oauthModelRecords)
      .where(and(eq(oauthModelRecords.modelType, this.modelType), eq(oauthModelRecords.id, id)))
  }

  async revokeByGrantId(grantId: string) {
    // The Grant row's own `grant_id` column is null (it isn't a child of
    // another grant, it IS the grant) — the first delete only removes
    // AccessToken/RefreshToken rows issued under it. Without the second
    // delete, the Grant row itself survives, tokens revoked, but Settings →
    // Connected apps keeps listing the app as connected forever since that
    // list is read straight from surviving Grant rows.
    await db.delete(oauthModelRecords).where(eq(oauthModelRecords.grantId, grantId))
    await db.delete(oauthModelRecords).where(and(eq(oauthModelRecords.modelType, 'Grant'), eq(oauthModelRecords.id, grantId)))
  }
}

type OauthModelRow = typeof oauthModelRecords.$inferSelect

function rowToPayload(row: OauthModelRow | undefined) {
  if (!row) return undefined
  // oidc-provider expects `undefined`, not a stale row, once something is
  // either past its expiry or already consumed — consume() only marks it
  // (rather than deleting outright) because a handful of grant types still
  // need to read a just-consumed record briefly, e.g. to detect replay.
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) return undefined
  const payload = row.payload as Record<string, unknown>
  return row.consumedAt ? { ...payload, consumed: Math.floor(new Date(row.consumedAt).getTime() / 1000) } : payload
}

// oidc-provider doesn't run its own cleanup job — expired/consumed rows
// would otherwise accumulate forever. Not wired to a cron yet (no
// scheduler exists in this app today beyond the MUFAP sync); safe to call
// manually or from a future cron route.
export async function pruneExpiredOauthRecords() {
  await db
    .delete(oauthModelRecords)
    .where(and(isNotNull(oauthModelRecords.expiresAt), lt(oauthModelRecords.expiresAt, new Date().toISOString())))
}
