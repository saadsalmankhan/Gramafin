'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import clsx from 'clsx'

// Same switch markup/classes as the one in Settings > Preferences — kept
// identical since both read/write the same useTheme() state and should look
// and behave the same wherever they appear.
export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <Sun className="w-4 h-4 text-ink-muted" />
      <button
        role="switch"
        aria-checked={theme === 'dark'}
        aria-label="Toggle dark mode"
        onClick={toggle}
        className={clsx(
          'relative h-6 w-11 rounded-full transition-colors flex-shrink-0',
          theme === 'dark' ? 'bg-brand-600' : 'bg-gray-200 dark:bg-white/10'
        )}
      >
        <span
          className={clsx(
            'absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </button>
      <Moon className="w-4 h-4 text-ink-muted" />
    </div>
  )
}
