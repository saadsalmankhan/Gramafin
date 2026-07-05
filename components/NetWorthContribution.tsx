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
  const share = netWorth !== 0 ? Math.round((amount / netWorth) * 100) : null
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-ink-muted mb-6 flex-wrap">
      <span>
        {label} add <span className="font-mono font-medium text-ink-secondary">{fmt(amount)}</span> to your net worth
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
