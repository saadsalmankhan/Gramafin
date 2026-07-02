import { NextResponse } from 'next/server'
import { getUserByEmail, updateUserPassword } from '@/lib/auth/users'
import { consumePasswordResetToken } from '@/lib/auth/passwordReset'
import { sendPasswordChangedEmail } from '@/lib/email'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!token) {
    return NextResponse.json({ error: 'Missing reset token' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const email = await consumePasswordResetToken(token)
  if (!email) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 })
  }

  const user = await getUserByEmail(email)
  if (!user) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 })
  }

  await updateUserPassword(email, password)

  try {
    const changedAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
    await sendPasswordChangedEmail({ to: user.email, name: user.name, changedAt })
  } catch (err) {
    console.error('Failed to send password-changed confirmation:', err)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
