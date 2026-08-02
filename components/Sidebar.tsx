'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useLayoutEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useStore } from '@/lib/store'
import { CURRENCIES } from '@/types'
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Building2,
  Target,
  PanelLeftClose,
  LogOut,
  CloudOff,
  HelpCircle,
  Settings,
} from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/income',       label: 'Income',       icon: Wallet },
  { href: '/expenses',     label: 'Expenses',     icon: Receipt },
  { href: '/budget',       label: 'Budget',       icon: Target },
  { href: '/assets',       label: 'Assets & Liabilities', icon: Building2 },
]

const COLLAPSE_KEY = 'wm_sidebar_collapsed'
const WIDTH_KEY = 'wm_sidebar_width'
const NARROW_BREAKPOINT = 768
const COLLAPSED_W = 76
const MIN_EXPANDED_W = 180
const MAX_EXPANDED_W = 360
const DEFAULT_EXPANDED_W = 240

function setCssWidth(px: number) {
  document.documentElement.style.setProperty('--sidebar-w', `${px}px`)
}

export default function Sidebar() {
  const path = usePathname()
  const { data: session } = useSession()
  const { state, syncError } = useStore()
  const currencyLabel = CURRENCIES.find(c => c.code === state.preferences.currency)?.code ?? 'PKR'
  const initial = session?.user?.name?.trim()?.[0]?.toUpperCase() ?? '?'
  const [collapsed, setCollapsed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const widthRef = useRef(DEFAULT_EXPANDED_W)

  useLayoutEffect(() => {
    const storedWidth = parseInt(localStorage.getItem(WIDTH_KEY) || '', 10)
    const initialWidth =
      Number.isFinite(storedWidth) && storedWidth >= MIN_EXPANDED_W && storedWidth <= MAX_EXPANDED_W
        ? storedWidth
        : DEFAULT_EXPANDED_W
    widthRef.current = initialWidth

    const isNarrow = window.innerWidth < NARROW_BREAKPOINT
    const storedCollapsed = localStorage.getItem(COLLAPSE_KEY) === '1'
    const initialCollapsed = isNarrow ? true : storedCollapsed
    setCollapsed(initialCollapsed)
    setCssWidth(initialCollapsed ? COLLAPSED_W : initialWidth)

    function onResize() {
      if (window.innerWidth < NARROW_BREAKPOINT) {
        setCollapsed(true)
        setCssWidth(COLLAPSED_W)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function toggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      setCssWidth(next ? COLLAPSED_W : widthRef.current)
      return next
    })
  }

  function onResizeStart(e: React.PointerEvent) {
    e.preventDefault()
    setDragging(true)

    function onMove(ev: PointerEvent) {
      const next = Math.min(MAX_EXPANDED_W, Math.max(MIN_EXPANDED_W, ev.clientX))
      widthRef.current = next
      setCssWidth(next)
    }
    function onUp() {
      setDragging(false)
      localStorage.setItem(WIDTH_KEY, String(widthRef.current))
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-shell-bg flex flex-col',
        !dragging && 'transition-[width] duration-200 ease-in-out'
      )}
      style={{ width: 'var(--sidebar-w)' }}
    >
      {/* Logo + collapse toggle. The toggle lives here, next to the brand
          mark, rather than anywhere in the nav/footer stack below — it's
          chrome for the sidebar itself, not a destination or account
          control, so it shouldn't compete visually with either group. */}
      <div className="px-4 py-6 border-b border-shell-border/10 flex items-center justify-between">
        {collapsed ? (
          <button
            onClick={toggle}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="mx-auto rounded-lg transition-opacity hover:opacity-70"
          >
            <Image src="/logo-mark-on-dark.png" alt="Gramafin" width={314} height={295} className="w-8 h-auto shrink-0" priority />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Image src="/logo-mark-on-dark.png" alt="Gramafin" width={314} height={295} className="w-8 h-auto shrink-0" priority />
              <div className="whitespace-nowrap">
                <p className="font-grotesk font-semibold text-sm text-shell-ink leading-none">Gramafin</p>
                <p className="text-[10px] text-shell-ink-muted mt-0.5">Personal Finance</p>
              </div>
            </div>
            <button
              onClick={toggle}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="p-1.5 rounded-md text-shell-ink-muted hover:bg-white/5 hover:text-shell-ink transition-colors shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-hidden">
        {!collapsed && <p className="text-[10px] font-medium uppercase tracking-widest text-shell-ink-muted px-3 mb-3">Menu</p>}
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-pill text-sm transition-colors whitespace-nowrap',
                collapsed && 'justify-center',
                active
                  ? 'bg-shell-active/15 text-shell-ink font-medium'
                  : 'text-shell-ink-muted hover:bg-white/5 hover:text-shell-ink'
              )}
            >
              <Icon className={clsx('w-4 h-4 shrink-0', active ? 'text-brand-500' : 'text-shell-ink-muted')} />
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>

      {/* Settings + Help */}
      <div className="px-3 space-y-0.5">
        <Link
          href="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-pill text-sm text-shell-ink-muted hover:bg-white/5 hover:text-shell-ink transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && 'Settings'}
        </Link>
        <Link
          href="/help"
          title={collapsed ? 'Help Centre' : undefined}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-pill text-sm text-shell-ink-muted hover:bg-white/5 hover:text-shell-ink transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          {!collapsed && 'Help Centre'}
        </Link>
      </div>

      {/* User + footer */}
      {collapsed ? (
        <div className="px-3 pb-3 flex flex-col items-center gap-2 border-t border-shell-border/10 pt-3">
          {syncError && (
            <span title="Sync failed — changes aren't saving">
              <CloudOff className="w-4 h-4 text-danger" />
            </span>
          )}
          <div
            className="w-7 h-7 rounded-full bg-white/10 text-shell-ink flex items-center justify-center text-xs font-semibold shrink-0"
            title={session?.user?.name || undefined}
          >
            {initial}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Log out"
            className="text-shell-ink-muted hover:text-danger transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="px-3 py-3 border-t border-shell-border/10">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-white/10 text-shell-ink flex items-center justify-center text-xs font-semibold shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-shell-ink truncate">{session?.user?.name}</p>
              <p className="text-[10px] text-shell-ink-muted truncate">{session?.user?.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Log out"
              className="text-shell-ink-muted hover:text-danger transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          {syncError ? (
            <p className="text-[10px] text-danger px-2 mt-2 flex items-center gap-1">
              <CloudOff className="w-3 h-3" /> Sync failed — check your connection
            </p>
          ) : (
            <p className="text-[10px] text-shell-ink-muted px-2 mt-2">All amounts in {currencyLabel}</p>
          )}
        </div>
      )}

      {/* Drag-to-resize handle */}
      {!collapsed && (
        <div
          onPointerDown={onResizeStart}
          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-brand-500/40 active:bg-brand-500/60"
        />
      )}
    </aside>
  )
}
