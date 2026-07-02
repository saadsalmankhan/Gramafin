import { NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/auth/users'
import { createPasswordResetToken } from '@/lib/auth/passwordReset'
import { sendPasswordResetEmail } from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Always returns the same generic response, whether or not the email is
// registered, so this endpoint can't be used to enumerate accounts.
const GENERIC_RESPONSE = { message: "If an account exists for that email, we've sent a password reset link." }

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
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
