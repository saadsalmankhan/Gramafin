'use client'

import Link from 'next/link'
import { fmt } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

interface Props {
  label: string
  amount: number
  netWorth: number
}

// Cross-links a source page (Assets, Investments, Mutual Funds, Settings)
// back to the Dashboard's net worth roll-up, so the numbers on this page are
// visibly part of a bigger picture rather than feeling disconnected from it.
export default function NetWorthContribution({ label, amount, netWorth }: Props) {
  // A negative amount (e.g. liabilities) reads as a double-negative under
  // "add Rs -X to your net worth — -Y%" — phrase it as subtracting the
  // absolute value instead, so both the amount and share read as plain
  // positive numbers with the sign carried by the verb, not the figures.
  const isNegative = amount < 0
  const share = netWorth !== 0 ? Math.round((Math.abs(amount) / netWorth) * 100) : null
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-ink-muted mb-6 flex-wrap">
      <span>
        {label} {isNegative ? 'subtract' : 'add'}{' '}
        <span className="font-mono font-medium text-ink-secondary">{fmt(Math.abs(amount))}</span>{' '}
        {isNegative ? 'from' : 'to'} your net worth
        {share !== null && <> — {share}% of {fmt(netWorth)}</>}
      </span>
      <Link
        href="/dashboard#net-worth"
        className="text-brand-600 hover:text-brand-700 flex items-center gap-1 flex-shrink-0"
      >
        See full breakdown <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  )
}
