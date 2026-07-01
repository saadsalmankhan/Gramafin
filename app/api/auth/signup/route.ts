import { NextResponse } from 'next/server'
import { createUser } from '@/lib/auth/users'
import { createVerificationToken } from '@/lib/auth/verification'
import { sendVerificationEmail } from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  try {
    const user = await createUser({ email, password, name })
    const token = await createVerificationToken(user.email)
    await sendVerificationEmail({ to: user.email, name: user.name, token })

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    console.error('Signup failed:', err)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
