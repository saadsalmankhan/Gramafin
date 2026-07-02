import Link from 'next/link'
import Image from 'next/image'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import {
  Receipt,
  Building2,
  Target,
  TrendingUp,
  PieChart,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Lock,
} from 'lucide-react'

const bigFeatures = [
  {
    icon: Receipt,
    title: 'Expense tracking',
    desc: 'Log every rupee you spend and see where it actually goes, by category and by month.',
    bars: [40, 70, 35, 90, 55, 80],
  },
  {
    icon: TrendingUp,
    title: 'Investments',
    desc: 'Monitor stocks, crypto, and bonds with live gain/loss and portfolio allocation.',
    bars: [30, 42, 38, 58, 50, 72],
  },
]

const smallFeatures = [
  { icon: Target, title: 'Budgets', desc: 'Set monthly limits per category, stay under them.' },
  { icon: Building2, title: 'Net worth', desc: 'Assets and liabilities, together in one number.' },
  { icon: PieChart, title: 'Mutual funds', desc: 'Track units held and NAV over time.' },
]

const stats = [
  { value: '6', label: 'Core modules', color: 'text-brand-600' },
  { value: '100%', label: 'Your data stays yours', color: 'text-success' },
  { value: 'Rs 0', label: 'Cost to get started', color: 'text-warning' },
]

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Announcement bar */}
      <div className="bg-ink-primary text-white text-xs text-center py-2 px-4">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-200" />
          Gramafin is free, forever — no credit card, no catch.
        </span>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Image src="/logo-full.png" alt="Gramafin" width={505} height={126} className="h-6 w-auto" priority />
          <nav className="hidden sm:flex items-center gap-8 text-sm text-ink-secondary">
            <a href="#features" className="hover:text-ink-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-ink-primary transition-colors">How it works</a>
            <Link href="/help" className="hover:text-ink-primary transition-colors">Help Centre</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink-secondary hover:text-ink-primary transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="h-9 px-4 rounded-full bg-ink-primary text-white text-sm font-medium flex items-center hover:bg-black transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 sm:pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl sm:text-6xl font-semibold leading-[1.05] tracking-tight">
            <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
              All-in-One
            </span>
            <br />
            <span className="text-ink-primary">Money Management.</span>
          </h1>
          <p className="text-base text-ink-muted mt-6 max-w-md leading-relaxed">
            Expenses, budgets, net worth, and investments — in one place, in PKR.
            No spreadsheets, no guesswork, no fees.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/signup"
              className="h-12 px-6 rounded-full bg-ink-primary text-white text-sm font-medium flex items-center gap-2 hover:bg-black transition-colors"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="text-sm text-ink-secondary hover:text-ink-primary transition-colors">
              Already have an account?
            </Link>
          </div>
        </div>

        {/* Product mockup */}
        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-to-br from-brand-100 to-brand-200 rounded-[2rem] -z-10 blur-2xl opacity-70" />
          <div className="card shadow-xl border-gray-100 p-0 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
              <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
              <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
            </div>
            <div className="p-5">
              <div className="flex items-baseline justify-between mb-1">
                <p className="section-label">Net worth</p>
                <span className="text-[10px] font-medium text-success bg-green-50 px-1.5 py-0.5 rounded-full">
                  +8.2%
                </span>
              </div>
              <p className="text-2xl font-mono font-semibold text-ink-primary mb-4">Rs 4.82M</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="metric-card">
                  <p className="text-[10px] text-ink-muted mb-1">Spent this month</p>
                  <p className="text-sm font-mono font-semibold text-danger">−Rs 82,400</p>
                </div>
                <div className="metric-card">
                  <p className="text-[10px] text-ink-muted mb-1">Budget left</p>
                  <p className="text-sm font-mono font-semibold text-success">Rs 37,600</p>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { label: 'Grocery run', cat: 'FO', amt: '−1,240', color: '#2a78d6' },
                  { label: 'Salary', cat: 'IN', amt: '+250,000', color: '#1baf7a' },
                  { label: 'Electricity bill', cat: 'UT', amt: '−6,800', color: '#eda100' },
                ].map(t => (
                  <div key={t.label} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold"
                        style={{ background: t.color + '18', color: t.color }}
                      >
                        {t.cat}
                      </div>
                      <span className="text-xs text-ink-primary">{t.label}</span>
                    </div>
                    <span className={`text-xs font-mono font-medium ${t.amt.startsWith('−') ? 'text-danger' : 'text-success'}`}>
                      {t.amt}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value props strip */}
      <section className="border-y border-gray-100 bg-surface-0">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Private by design</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Built for PKR</span>
          <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Free forever</span>
        </div>
      </section>

      {/* Bento features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
              Take control
            </span>{' '}
            <span className="text-ink-primary">of your finances</span>
          </h2>
          <p className="text-sm text-ink-muted mt-3">Everything you need, nothing you don&apos;t.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {bigFeatures.map(({ icon: Icon, title, desc, bars }) => (
            <div key={title} className="card">
              <div className="flex items-end gap-1.5 h-16 mb-5">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-gradient-to-t from-brand-700 to-brand-500 opacity-80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                <Icon className="w-4 h-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-medium text-ink-primary mb-1.5">{title}</h3>
              <p className="text-xs text-ink-muted leading-relaxed max-w-sm">{desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {smallFeatures.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card">
              <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                <Icon className="w-4 h-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-medium text-ink-primary mb-1.5">{title}</h3>
              <p className="text-xs text-ink-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Showcase row */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="card grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-10">
          <div>
            <p className="section-label mb-3">How it works</p>
            <h3 className="text-2xl font-semibold text-ink-primary mb-3">
              One dashboard, your whole financial picture.
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed max-w-md">
              Sign up, add your expenses and accounts as they happen, and Gramafin
              keeps a running picture of your net worth, budgets, and portfolio —
              updated automatically as you go.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Cash', pct: 65, color: '#2a78d6' },
              { label: 'Stocks', pct: 40, color: '#1baf7a' },
              { label: 'Funds', pct: 25, color: '#eda100' },
            ].map(a => (
              <div key={a.label} className="flex flex-col items-center gap-2">
                <div className="w-full h-24 bg-surface-1 rounded-lg flex items-end overflow-hidden">
                  <div
                    className="w-full rounded-t-lg"
                    style={{ height: `${a.pct}%`, background: a.color }}
                  />
                </div>
                <span className="text-[11px] text-ink-muted">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-gray-100 bg-surface-0">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <p className={`text-4xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-ink-muted mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-ink-primary rounded-card p-10 sm:p-14 text-center">
          <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">
            Get your finances in order.
          </h3>
          <p className="text-sm text-gray-400 mb-8">Free forever. Set up in under a minute.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-ink-primary text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/logo-full.png" alt="Gramafin" width={505} height={126} className="h-5 w-auto" />
          <p className="text-xs text-ink-muted">Personal finance in PKR — free, forever.</p>
        </div>
      </footer>
    </div>
  )
}
