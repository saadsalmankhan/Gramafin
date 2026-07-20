'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Landmark, Receipt, TrendingUp, HandCoins, Wallet, PartyPopper, X } from 'lucide-react'

interface Step {
  icon: typeof Sparkles
  title: string
  body: string
  cta?: { label: string; href: string }
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Welcome to Gramafin',
    body: "Let's get your account set up — a few quick steps covering the core things Gramafin tracks. Takes about two minutes, and you can jump straight to any step without reading the rest.",
  },
  {
    icon: Landmark,
    title: 'Add a bank account',
    body: 'Add your checking, savings, or credit card accounts with a starting balance. Once added, expenses paid from an account keep its balance in sync automatically.',
    cta: { label: 'Go to Settings', href: '/settings' },
  },
  {
    icon: Receipt,
    title: 'Log an expense',
    body: "Track where your money goes. Pick a category and, if it's paid from a bank account or credit card you've added, Gramafin adjusts that balance for you.",
    cta: { label: 'Go to Expenses', href: '/expenses' },
  },
  {
    icon: TrendingUp,
    title: 'Add a stock or mutual fund',
    body: 'Track investments — PSX stocks with live price updates, or mutual funds with daily NAVs pulled from MUFAP.',
    cta: { label: 'Go to Investments', href: '/assets?tab=assets&sub=Stocks' },
  },
  {
    icon: HandCoins,
    title: 'Add a liability',
    body: "Track what you owe — loans, personal debt, or anything else that should count against your net worth.",
    cta: { label: 'Go to Liabilities', href: '/assets?tab=liabilities' },
  },
  {
    icon: Wallet,
    title: 'Add your salary or income',
    body: 'Log one-time or recurring income — like a monthly paycheck that deposits into a bank account automatically on schedule.',
    cta: { label: 'Go to Income', href: '/income' },
  },
  {
    icon: PartyPopper,
    title: "You're all set",
    body: "That's everything. Come back to any page whenever you're ready — nothing here is required to use Gramafin, it's just the fastest way to get real numbers on your dashboard.",
  },
]

interface Props {
  onDismissSession: () => void
  onDismissForever: () => void
}

export default function QuickStartGuide({ onDismissSession, onDismissForever }: Props) {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1
  const Icon = step.icon

  function goToStep() {
    if (step.cta) router.push(step.cta.href)
    onDismissSession()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onDismissSession}>
      <div className="card max-w-md w-full relative" onClick={e => e.stopPropagation()}>
        <button
          className="absolute top-4 right-4 text-ink-muted hover:text-ink-primary transition-colors"
          onClick={onDismissSession}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-brand-600" />
        </div>

        <h2 className="text-base font-semibold text-ink-primary mb-2">{step.title}</h2>
        <p className="text-sm text-ink-secondary leading-relaxed mb-5">{step.body}</p>

        <div className="flex items-center gap-1.5 mb-6" aria-hidden="true">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${i === stepIndex ? 'w-5 bg-brand-600' : 'w-1.5 bg-gray-200 dark:bg-white/10'}`}
            />
          ))}
        </div>

        {step.cta && (
          <button className="btn-primary w-full justify-center mb-2" onClick={goToStep}>
            {step.cta.label} →
          </button>
        )}

        <div className="flex items-center justify-between">
          <button className="text-xs text-ink-muted hover:text-ink-primary transition-colors" onClick={onDismissForever}>
            Don&apos;t show this again
          </button>
          <div className="flex items-center gap-2">
            {isFirst && (
              <button className="btn-ghost h-8 text-xs" onClick={onDismissSession}>
                I&apos;ll do this later
              </button>
            )}
            {!isFirst && (
              <button className="btn-ghost h-8 text-xs" onClick={() => setStepIndex(i => i - 1)}>
                Back
              </button>
            )}
            {isLast ? (
              <button className="btn-primary h-8 text-xs" onClick={onDismissSession}>
                Done
              </button>
            ) : (
              <button className={`h-8 text-xs ${step.cta ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setStepIndex(i => i + 1)}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
