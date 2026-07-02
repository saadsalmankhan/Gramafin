import { redis } from '@/lib/redis'

const TOKEN_TTL_SECONDS = 60 * 60 // 1 hour — shorter-lived than email verification tokens

function tokenKey(token: string): string {
  return `reset-token:${token}`
}

export async function createPasswordResetToken(email: string): Promise<string> {
  const token = crypto.randomUUID()
  await redis.set(tokenKey(token), email.trim().toLowerCase(), { ex: TOKEN_TTL_SECONDS })
  return token
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const email = await redis.get<string>(tokenKey(token))
  if (!email) return null
  await redis.del(tokenKey(token))
  return email
}
