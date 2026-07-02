'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MailCheck } from 'lucide-react'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Failed to create account')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="card">
          <MailCheck className="w-10 h-10 text-brand-600 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-ink-primary">Check your email</h1>
          <p className="text-sm text-ink-muted mt-1">
            We sent a verification link to <span className="font-medium text-ink-primary">{email}</span>.
            Click it to activate your account, then log in.
          </p>
          <Link href="/login" className="btn-primary w-full justify-center mt-5">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <Image src="/logo-full.png" alt="Gramafin" width={505} height={126} className="h-9 w-auto mb-4" priority />
        <h1 className="text-lg font-semibold text-ink-primary">Create your account</h1>
        <p className="text-sm text-ink-muted mt-1">Start tracking your wealth with Gramafin</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-3">
        {error && <p className="text-xs text-danger bg-red-50 px-3 py-2 rounded">{error}</p>}
        <input
          className="input"
          placeholder="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
          autoComplete="name"
          required
        />
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password (min. 8 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p className="text-center text-sm text-ink-muted mt-5">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
