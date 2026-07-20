'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { LayoutGrid } from 'lucide-react'
import { HELP_CATEGORIES } from '@/lib/helpCategories'

export default function HelpSidebar() {
  const pathname = usePathname()
  const activeCategory = useSearchParams()?.get('category') ?? null
  const onIndex = pathname === '/help'

  const items = [
    { id: null, label: 'All articles', icon: LayoutGrid },
    ...HELP_CATEGORIES.map(c => ({ id: c.id, label: c.label, icon: c.icon })),
  ]

  return (
    <>
      {/* Mobile: horizontal scrollable pill row */}
      <nav className="flex md:hidden gap-2 overflow-x-auto px-6 pt-6 pb-2 -mb-2">
        {items.map(item => {
          const active = onIndex && activeCategory === item.id
          return (
            <Link
              key={item.label}
              href={item.id ? `/help?category=${item.id}` : '/help'}
              className={clsx(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors',
                active
                  ? 'bg-brand-50 border-brand-200 text-brand-700 font-medium'
                  : 'border-gray-100 text-ink-muted hover:text-ink-primary'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Desktop: sticky vertical sidebar */}
      <nav className="hidden md:block w-56 flex-shrink-0 pl-6 pr-4 py-16">
        <div className="sticky top-24 space-y-0.5">
          <p className="text-[11px] font-medium text-ink-muted uppercase tracking-wide px-3 mb-2">Categories</p>
          {items.map(item => {
            const active = onIndex && activeCategory === item.id
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.id ? `/help?category=${item.id}` : '/help'}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-ink-secondary hover:bg-surface-0 hover:text-ink-primary'
                )}
              >
                <Icon className={clsx('w-3.5 h-3.5 shrink-0', active ? 'text-brand-600' : 'text-ink-muted')} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
