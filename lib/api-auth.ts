import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/options'
import { apiRatelimit } from '@/lib/ratelimit'

type AuthResult = { userId: string; error?: undefined } | { userId?: undefined; error: NextResponse }

// Shared by every per-entity API route (bootstrap + ~20 CRUD endpoints) —
// factored out of what was, in the single-blob era, inline duplicate
// auth-check + rate-limit code in the one /api/data route. One shared
// `api:<userId>` bucket across all of them, matching how the old blob PUT
// was rate-limited as a single endpoint.
export async function requireUserId(): Promise<AuthResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { success } = await apiRatelimit.limit(`api:${session.user.id}`)
  if (!success) {
    return { error: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) }
  }

  return { userId: session.user.id }
}
