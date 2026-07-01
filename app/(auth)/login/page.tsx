'use client'

import { FormEvent, Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Wallet } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justVerified = searchParams.get('verified') === '1'
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await signIn('credentials', { email, password, redirect: false })

    setLoading(false)
    if (res?.error) {
      setError(res.error === 'CredentialsSignin' ? 'Invalid email or password' : res.error)
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center mb-3">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-lg font-semibold text-ink-primary">Welcome back</h1>
        <p className="text-sm text-ink-muted mt-1">Log in to Gramafin</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-3">
        {justVerified && !error && (
          <p className="text-xs text-success bg-green-50 px-3 py-2 rounded">
            Email verified — you can log in now.
          </p>
        )}
        {error && <p className="text-xs text-danger bg-red-50 px-3 py-2 rounded">{error}</p>}
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
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="text-center text-sm text-ink-muted mt-5">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-brand-600 font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
