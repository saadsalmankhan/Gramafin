'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  Building2,
  Target,
  TrendingUp,
  Wallet,
  PieChart,
} from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { href: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/expenses',     label: 'Expenses',     icon: Receipt },
  { href: '/assets',       label: 'Net worth',    icon: Building2 },
  { href: '/budget',       label: 'Budget',       icon: Target },
  { href: '/investments',  label: 'Investments',  icon: TrendingUp },
  { href: '/mutual-funds', label: 'Mutual Funds', icon: PieChart },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="fixed left-0 top-0 w-60 h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-primary leading-none">Gramafin</p>
            <p className="text-[10px] text-ink-muted mt-0.5">Personal Finance</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="section-label px-3 mb-3">Menu</p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-ink-secondary hover:bg-surface-0 hover:text-ink-primary'
              )}
            >
              <Icon className={clsx('w-4 h-4', active ? 'text-brand-600' : 'text-ink-muted')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100">
        <p className="text-[10px] text-ink-muted">All amounts in PKR</p>
      </div>
    </aside>
  )
}
