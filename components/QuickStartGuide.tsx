'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { ONBOARDING_STEPS, getInitialStepIndex } from '@/lib/onboardingSteps'

const STEPS = ONBOARDING_STEPS

interface Props {
  onDismissSession: () => void
  onDismissForever: () => void
}

export default function QuickStartGuide({ onDismissSession, onDismissForever }: Props) {
  const router = useRouter()
  const { state } = useStore()
  const [stepIndex, setStepIndex] = useState(() => getInitialStepIndex(state))
  const step = STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1
  const Icon = step.icon

  function goToStep() {
    if (step.cta) router.push(step.cta.href)
    onDismissSession()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onDismissSession}>
      <div className="card max-w-md w-full relative" onClick={e => e.stopPropagation()}>
        <button
          className="absolute top-4 right-4 text-ink-muted hover:text-ink-primary transition-colors"
          onClick={onDismissSession}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-brand-600" />
        </div>

        <h2 className="text-base font-semibold text-ink-primary mb-2">{step.title}</h2>
        <p className="text-sm text-ink-secondary leading-relaxed mb-5">{step.body}</p>

        <div className="flex items-center gap-1.5 mb-6" aria-hidden="true">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${i === stepIndex ? 'w-5 bg-brand-600' : 'w-1.5 bg-gray-200 dark:bg-white/10'}`}
            />
          ))}
        </div>

        {step.cta && (
          <button className="btn-primary w-full justify-center mb-2" onClick={goToStep}>
            {step.cta.label} →
          </button>
        )}

        <div className="flex items-center justify-between">
          <button className="text-xs text-ink-muted hover:text-ink-primary transition-colors" onClick={onDismissForever}>
            Don&apos;t show this again
          </button>
          <div className="flex items-center gap-2">
            {isFirst && (
              <button className="btn-ghost h-8 text-xs" onClick={onDismissSession}>
                I&apos;ll do this later
              </button>
            )}
            {!isFirst && (
              <button className="btn-ghost h-8 text-xs" onClick={() => setStepIndex(i => i - 1)}>
                Back
              </button>
            )}
            {isLast ? (
              <button className="btn-primary h-8 text-xs" onClick={onDismissSession}>
                Done
              </button>
            ) : (
              <button className={`h-8 text-xs ${step.cta ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setStepIndex(i => i + 1)}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
