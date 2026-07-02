'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { XCircle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Failed to reset password')
      return
    }

    router.push('/login?reset=1')
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="card">
          <XCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-ink-primary">Link invalid or expired</h1>
          <p className="text-sm text-ink-muted mt-1">
            This password reset link is missing its token. Request a new one to continue.
          </p>
          <Link href="/forgot-password" className="btn-primary w-full justify-center mt-5">
            Request new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <Image src="/logo-full.png" alt="Gramafin" width={505} height={126} className="h-9 w-auto mb-4" priority />
      </div>
      <h1 className="text-lg font-semibold text-ink-primary">Choose a new password</h1>
      <p className="text-sm text-ink-muted mt-1 mb-8">Make it at least 8 characters.</p>

      <form onSubmit={handleSubmit} className="card space-y-3">
        {error && <p className="text-xs text-danger bg-red-50 px-3 py-2 rounded">{error}</p>}
        <input
          className="input"
          type="password"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
