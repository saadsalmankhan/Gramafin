'use client'

import Link from 'next/link'
import { useStore } from '@/lib/store'
import { ACTIONABLE_STEPS } from '@/lib/onboardingSteps'
import { Check } from 'lucide-react'

// A persistent, data-driven progress tracker on the dashboard — not the
// same thing as the dismissible first-login QuickStartGuide modal. This
// reflects real completion (does the user actually have a bank account,
// an expense, etc.), not whether they clicked through a wizard, and
// disappears on its own once every step is genuinely done rather than
// needing a dismiss action.
export default function SetupChecklist() {
  const { state } = useStore()
  const doneCount = ACTIONABLE_STEPS.filter(s => s.isComplete!(state)).length

  if (doneCount === ACTIONABLE_STEPS.length) return null

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-medium text-ink-primary">Getting started</h2>
        <span className="text-xs text-ink-muted font-mono">
          {doneCount}/{ACTIONABLE_STEPS.length}
        </span>
      </div>
      <p className="text-xs text-ink-muted mb-4">A few things to set up before Gramafin has the full picture.</p>

      <div className="flex items-center gap-1.5 mb-5" aria-hidden="true">
        {ACTIONABLE_STEPS.map(step => (
          <div
            key={step.id}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              step.isComplete!(state) ? 'bg-brand-600' : 'bg-gray-200 dark:bg-white/10'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ACTIONABLE_STEPS.map(step => {
          const done = step.isComplete!(state)
          const Icon = step.icon
          return (
            <Link
              key={step.id}
              href={done ? '#' : step.cta!.href}
              aria-disabled={done}
              onClick={e => done && e.preventDefault()}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                done
                  ? 'border-gray-100 dark:border-white/5 text-ink-muted cursor-default'
                  : 'border-gray-200 dark:border-white/10 text-ink-secondary hover:border-brand-300 hover:bg-surface-0'
              }`}
            >
              {done ? (
                <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
              ) : (
                <Icon className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
              )}
              <span className={done ? 'line-through' : ''}>{step.title}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
