import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import {
  Wallet,
  Receipt,
  Building2,
  Target,
  TrendingUp,
  PieChart,
  ArrowRight,
} from 'lucide-react'

const features = [
  {
    icon: Receipt,
    title: 'Expense tracking',
    desc: 'Log every rupee you spend and see where it actually goes, by category and by month.',
  },
  {
    icon: Target,
    title: 'Budgets',
    desc: 'Set monthly limits per category and get a clear read on how close you are to blowing them.',
  },
  {
    icon: Building2,
    title: 'Net worth',
    desc: 'Track assets and liabilities together — cash, property, gold, and debt — in one number.',
  },
  {
    icon: TrendingUp,
    title: 'Investments',
    desc: 'Monitor stocks, crypto, and bonds with live gain/loss and portfolio allocation.',
  },
  {
    icon: PieChart,
    title: 'Mutual funds',
    desc: 'Track units held and NAV over time to see real, realized, and unrealized returns.',
  },
]

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-ink-primary">Gramafin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">Log in</Link>
            <Link href="/signup" className="btn-primary">Sign up</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold text-ink-primary leading-tight tracking-tight">
          Your money, finally in one place.
        </h1>
        <p className="text-base text-ink-muted mt-5 max-w-xl mx-auto leading-relaxed">
          Gramafin brings your expenses, budgets, net worth, and investments together
          so you always know exactly where you stand — in PKR.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link href="/signup" className="btn-primary h-11 px-6 text-sm">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/login" className="btn-ghost h-11 px-6 text-sm">
            Log in
          </Link>
        </div>
        <p className="text-xs text-ink-muted mt-4">Free forever. No credit card required.</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card">
              <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                <Icon className="w-4 h-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-medium text-ink-primary mb-1.5">{title}</h3>
              <p className="text-xs text-ink-muted leading-relaxed">{desc}</p>
            </div>
          ))}
          <div className="card flex flex-col justify-center items-start bg-brand-600 border-brand-600">
            <h3 className="text-sm font-medium text-white mb-1.5">Ready to start?</h3>
            <p className="text-xs text-brand-50 leading-relaxed mb-4">
              Create a free account in under a minute.
            </p>
            <Link
              href="/signup"
              className="text-xs font-medium text-brand-700 bg-white rounded px-3 py-2 flex items-center gap-1.5 hover:bg-brand-50 transition-colors"
            >
              Sign up <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <p className="text-center text-xs text-ink-muted">
          Gramafin — personal finance in PKR
        </p>
      </footer>
    </div>
  )
}
