'use client'

import { FormEvent, Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CreditCard, Target, TrendingUp, Building2 } from 'lucide-react'
import AuthMarketingPanel from '@/components/AuthMarketingPanel'

const tips = [
  {
    icon: CreditCard,
    title: 'Set due dates on credit cards',
    desc: 'Get automatic reminders on your dashboard before bills are due.',
  },
  {
    icon: Target,
    title: 'Budget by category',
    desc: "You'll always know how much is left to spend this month.",
  },
  {
    icon: TrendingUp,
    title: 'Track NAV changes',
    desc: 'See real vs. unrealized gains on your mutual funds.',
  },
  {
    icon: Building2,
    title: 'Include liabilities',
    desc: 'Net worth accounts for what you owe, not just what you own.',
  },
]

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
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthMarketingPanel
        heading="Get the most out of Gramafin."
        subheading="A few tips before you log back in."
        items={tips}
        bars={[55, 40, 70, 50, 85, 60]}
      />

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <Image src="/logo-full.png" alt="Gramafin" width={505} height={126} className="h-9 w-auto mb-4" priority />
          </div>
          <h1 className="text-lg font-semibold text-ink-primary">Welcome back</h1>
          <p className="text-sm text-ink-muted mt-1 mb-8">Log in to Gramafin</p>

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
      </div>
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
