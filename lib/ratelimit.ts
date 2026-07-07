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

// Looser limit for authenticated, per-user API usage (data sync, uploads).
// The app PUTs to /api/data on every store change, so normal fast clicking
// (e.g. adding several expenses in a row) needs headroom above a strict cap —
// this is meant to stop a runaway loop or script, not ordinary interactive use.
export const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1 m'),
  analytics: true,
  prefix: 'ratelimit:api',
})

export function clientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
