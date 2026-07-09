import type { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CompoundInterestCalculator from '@/components/CompoundInterestCalculator'
import { ArrowRight } from 'lucide-react'

// See app/(auth)/layout.tsx — the CSP nonce is per-request.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Compound Interest Calculator (PKR) — Gramafin',
  description: 'Free compound interest calculator for Pakistani savers. See how your savings and monthly contributions grow over time in PKR.',
}

const BENEFITS: { feature: string; benefit: string }[] = [
  { feature: 'Expense tracking', benefit: 'Log every rupee you spend, categorized automatically, with monthly budgets per category.' },
  { feature: 'Net worth', benefit: 'Assets, liabilities, credit cards, investments, mutual funds, and bank accounts — combined into one real number.' },
  { feature: 'Income tracking', benefit: 'One-off and recurring salary, Pakistan-specific income sources, and Jul–Jun tax-year reporting.' },
  { feature: 'Investments', benefit: 'Track stocks, crypto, and bonds with live gain/loss and portfolio allocation.' },
  { feature: 'Mutual funds', benefit: 'Pakistani mutual funds with NAV tracking, so this calculator’s projections meet your real portfolio.' },
  { feature: 'Bank accounts', benefit: 'Checking, savings, and credit cards in PKR — credit card debt subtracts from your net worth automatically.' },
  { feature: 'Privacy', benefit: 'No bank-account linking required. Every number is one you entered — nothing is sold to third parties.' },
  { feature: 'Cost', benefit: 'Free, forever. No credit card to sign up.' },
]

export default function CompoundInterestCalculatorPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-2xl sm:text-3xl font-semibold text-ink-primary tracking-tight mb-2">
            Compound Interest Calculator
          </h1>
          <p className="text-sm text-ink-muted mb-10 max-w-xl">
            See how a starting amount and monthly contributions grow over time, in PKR — then track the real thing
            in Gramafin once you've got a number to aim for.
          </p>

          <CompoundInterestCalculator />

          <div className="mt-16">
            <h2 className="text-xl font-semibold text-ink-primary tracking-tight mb-2">Why track it with Gramafin</h2>
            <p className="text-sm text-ink-muted mb-6 max-w-xl">
              A calculator shows you where you could end up. Gramafin shows you where you actually are.
            </p>

            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left section-label px-5 py-3 whitespace-nowrap">Feature</th>
                    <th className="text-left section-label px-5 py-3">Benefit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {BENEFITS.map(row => (
                    <tr key={row.feature}>
                      <td className="px-5 py-3.5 font-medium text-ink-primary whitespace-nowrap align-top">{row.feature}</td>
                      <td className="px-5 py-3.5 text-ink-secondary align-top">{row.benefit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-ink-primary text-white text-sm font-medium hover:bg-black transition-colors"
              >
                Start tracking for free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
