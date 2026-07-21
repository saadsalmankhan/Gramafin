'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { MailCheck, Receipt, Target, Building2, TrendingUp } from 'lucide-react'
import AuthMarketingPanel from '@/components/AuthMarketingPanel'
import PasswordInput from '@/components/PasswordInput'
import TurnstileWidget from '@/components/TurnstileWidget'

const benefits = [
  {
    icon: Receipt,
    title: 'Expense tracking',
    desc: 'Log every rupee and see exactly where it goes.',
  },
  {
    icon: Target,
    title: 'Budgets',
    desc: 'Set monthly limits per category and stay on track.',
  },
  {
    icon: Building2,
    title: 'Net worth',
    desc: 'Assets, liabilities, and credit cards in one number.',
  },
  {
    icon: TrendingUp,
    title: 'Investments',
    desc: 'Stocks, mutual funds, and crypto with live returns.',
  },
]

export default function SignupPage() {
  const searchParams = useSearchParams()
  const referralCode = searchParams?.get('ref') || undefined
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Folds in a cookie-banner choice already made anonymously in this
    // browser, if any, so it isn't lost once the account actually exists.
    const cookieChoice = localStorage.getItem('gramafin_cookie_consent')

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
        referralCode,
        agreedToTerms,
        cookieChoice: cookieChoice || undefined,
        turnstileToken,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Failed to create account')
      return
    }

    setSent(true)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthMarketingPanel
        heading="Everything you need to manage your money."
        subheading="Free forever. Takes less than a minute to set up."
        items={benefits}
        bars={[40, 65, 35, 85, 55, 75]}
      />

      <div className="flex items-center justify-center px-4 py-16">
        {sent ? (
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
        ) : (
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center mb-8 lg:hidden">
              <Image src="/logo-full.png" alt="Gramafin" width={505} height={126} className="h-9 w-auto mb-4" priority />
            </div>
            <h1 className="text-lg font-semibold text-ink-primary">Create your account</h1>
            <p className="text-sm text-ink-muted mt-1 mb-8">Start tracking your wealth with Gramafin</p>

            <form onSubmit={handleSubmit} className="card space-y-3">
              {referralCode && !error && (
                <p className="text-xs text-success bg-green-50 px-3 py-2 rounded">
                  You were invited by a friend 🎉
                </p>
              )}
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
              <PasswordInput
                placeholder="Password (min. 8 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <label className="flex items-start gap-2 text-xs text-ink-muted leading-relaxed pt-1">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  required
                />
                <span>
                  I agree to Gramafin&apos;s{' '}
                  <Link href="/terms" target="_blank" className="text-brand-600 hover:underline">
                    Terms of Use
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-brand-600 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              <TurnstileWidget onVerify={setTurnstileToken} />
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
        )}
      </div>
    </div>
  )
}
