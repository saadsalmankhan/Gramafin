'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CreditCard, Target, TrendingUp, Building2, MailCheck } from 'lucide-react'
import AuthMarketingPanel from '@/components/AuthMarketingPanel'
import TurnstileWidget from '@/components/TurnstileWidget'

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, turnstileToken }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      return
    }

    setSent(true)
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
        {sent ? (
          <div className="w-full max-w-sm text-center">
            <div className="card">
              <MailCheck className="w-10 h-10 text-brand-600 mx-auto mb-3" />
              <h1 className="text-lg font-semibold text-ink-primary">Check your email</h1>
              <p className="text-sm text-ink-muted mt-1">
                If an account exists for <span className="font-medium text-ink-primary">{email}</span>, we've sent a
                password reset link. It expires in 1 hour.
              </p>
              <Link href="/login" className="btn-primary w-full justify-center mt-5">
                Back to login
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center mb-8 lg:hidden">
              <Image src="/logo-full.png" alt="Gramafin" width={505} height={126} className="h-9 w-auto mb-4" priority />
            </div>
            <h1 className="text-lg font-semibold text-ink-primary">Forgot your password?</h1>
            <p className="text-sm text-ink-muted mt-1 mb-8">
              Enter your email and we&apos;ll send you a link to reset it.
            </p>

            <form onSubmit={handleSubmit} className="card space-y-3">
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
              <TurnstileWidget onVerify={setTurnstileToken} />
              <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="text-center text-sm text-ink-muted mt-5">
              <Link href="/login" className="text-brand-600 font-medium hover:underline">
                Back to login
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
