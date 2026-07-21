import { NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/auth/users'
import { createPasswordResetToken } from '@/lib/auth/passwordReset'
import { sendPasswordResetEmail } from '@/lib/email'
import { authRatelimit, clientIp } from '@/lib/ratelimit'
import { verifyTurnstileToken } from '@/lib/turnstile'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Always returns the same generic response, whether or not the email is
// registered, so this endpoint can't be used to enumerate accounts.
const GENERIC_RESPONSE = { message: "If an account exists for that email, we've sent a password reset link." }

export async function POST(req: Request) {
  const { success } = await authRatelimit.limit(`forgot-password:${clientIp(req)}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in a minute.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }
  // No-op until TURNSTILE_SECRET_KEY is actually set — see lib/turnstile.ts.
  if (!(await verifyTurnstileToken(body?.turnstileToken, clientIp(req)))) {
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 400 })
  }

  // Also rate-limit per target email, independent of the caller's IP, so an
  // attacker can't email-bomb one victim's inbox by rotating IP addresses.
  const { success: emailOk } = await authRatelimit.limit(`forgot-password-email:${email}`)
  if (!emailOk) {
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
  }

  try {
    const user = await getUserByEmail(email)
    if (user) {
      const token = await createPasswordResetToken(user.email)
      await sendPasswordResetEmail({ to: user.email, name: user.name, token })
    }
  } catch (err) {
    console.error('Forgot-password failed:', err)
  }

  return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
}
