import { Sparkles, Landmark, Receipt, TrendingUp, HandCoins, Wallet, Users, PartyPopper } from 'lucide-react'
import type { AppState } from '@/types'

export interface OnboardingStep {
  id: string
  icon: typeof Sparkles
  title: string
  body: string
  cta?: { label: string; href: string }
  // Omitted for the welcome/done bookend steps, which have no real-world
  // action to check completion of.
  isComplete?: (state: AppState) => boolean
}

// Single source of truth for both the first-login QuickStartGuide modal and
// the persistent dashboard checklist — same 5 actions, same copy, same
// destinations. `?tour=1` on each href triggers the pointer highlight on
// the destination page (see components/TourHighlight.tsx) regardless of
// which of the two UIs sent the user there.
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome to Gramafin',
    body: "Let's get your account set up — a few quick steps covering the core things Gramafin tracks. Takes about two minutes, and you can jump straight to any step without reading the rest.",
  },
  {
    id: 'bank-account',
    icon: Landmark,
    title: 'Add a bank account',
    body: 'Add your checking, savings, or credit card accounts with a starting balance. Once added, expenses paid from an account keep its balance in sync automatically.',
    cta: { label: 'Go to Settings', href: '/settings?tour=1' },
    isComplete: state => state.bankAccounts.length > 0,
  },
  {
    id: 'expense',
    icon: Receipt,
    title: 'Log an expense',
    body: "Track where your money goes. Pick a category and, if it's paid from a bank account or credit card you've added, Gramafin adjusts that balance for you.",
    cta: { label: 'Go to Expenses', href: '/expenses?tour=1' },
    isComplete: state => state.expenses.length > 0,
  },
  {
    id: 'investment',
    icon: TrendingUp,
    title: 'Add a stock or mutual fund',
    body: 'Track investments — PSX stocks with live price updates, or mutual funds with daily NAVs pulled from MUFAP.',
    cta: { label: 'Go to Investments', href: '/assets?tab=assets&sub=Stocks&tour=1' },
    isComplete: state => state.investments.some(i => i.type === 'Stocks') || state.mutualFunds.length > 0,
  },
  {
    id: 'liability',
    icon: HandCoins,
    title: 'Add a liability',
    body: 'Track what you owe — loans, personal debt, or anything else that should count against your net worth.',
    cta: { label: 'Go to Liabilities', href: '/assets?tab=liabilities&tour=1' },
    isComplete: state => state.assets.length > 0,
  },
  {
    id: 'income',
    icon: Wallet,
    title: 'Add your salary or income',
    body: 'Log one-time or recurring income — like a monthly paycheck that deposits into a bank account automatically on schedule.',
    cta: { label: 'Go to Income', href: '/income?tour=1' },
    isComplete: state => state.incomes.length > 0 || state.recurringIncomes.length > 0,
  },
  {
    id: 'invite',
    icon: Users,
    title: 'Invite a friend',
    body: 'Share your referral link or invite someone by email — you earn points for every invite, more once they sign up.',
    cta: { label: 'Go to Invites', href: '/settings?tab=referrals&tour=1' },
    isComplete: state => state.referrals.sentCount > 0,
  },
  {
    id: 'done',
    icon: PartyPopper,
    title: "You're all set",
    body: "That's everything. Come back to any page whenever you're ready — nothing here is required to use Gramafin, it's just the fastest way to get real numbers on your dashboard.",
  },
]

export const ACTIONABLE_STEPS = ONBOARDING_STEPS.filter(s => s.cta && s.isComplete)

// Brand new users (nothing done yet) start at the 'welcome' bookend. Anyone
// who's already completed at least one action jumps straight to their next
// incomplete step instead of restarting from the top every time the modal
// reappears (e.g. on each login) — 'done' if every action is already complete.
export function getInitialStepIndex(state: AppState): number {
  const anyComplete = ACTIONABLE_STEPS.some(s => s.isComplete!(state))
  if (!anyComplete) return 0
  const firstIncomplete = ONBOARDING_STEPS.findIndex(s => s.isComplete && !s.isComplete(state))
  return firstIncomplete === -1 ? ONBOARDING_STEPS.length - 1 : firstIncomplete
}
