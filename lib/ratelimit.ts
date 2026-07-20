import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'

// Tight limit for unauthenticated auth endpoints (signup, login, password
// reset) — the highest-value brute-force / abuse / email-bombing targets.
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'ratelimit:auth',
})

// Looser limit for authenticated, per-user API usage — shared across
// /api/bootstrap and every per-entity CRUD route (see lib/api-auth.ts).
// Normal fast clicking (e.g. adding several expenses in a row) needs
// headroom above a strict cap; this is meant to stop a runaway loop or
// script, not ordinary interactive use.
export const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1 m'),
  analytics: true,
  prefix: 'ratelimit:api',
})

// Tighter than apiRatelimit — sending a real email per call makes this a
// more attractive spam/points-farming vector than ordinary CRUD, and it's
// sending through this app's own Resend account, so its reputation is on
// the line too.
export const referralInviteRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  analytics: true,
  prefix: 'ratelimit:referral-invite',
})

export function clientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
