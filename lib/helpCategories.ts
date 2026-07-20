import { Rocket, Receipt, Building2, TrendingUp, Settings, LucideIcon } from 'lucide-react'

export interface HelpCategory {
  id: string
  label: string
  icon: LucideIcon
}

// Single source of truth for the Help Center sidebar and the index page's
// grouped sections — order here is display order everywhere.
export const HELP_CATEGORIES: HelpCategory[] = [
  { id: 'getting-started', label: 'Getting started', icon: Rocket },
  { id: 'expenses-budgets', label: 'Expenses & budgets', icon: Receipt },
  { id: 'net-worth', label: 'Net worth & credit cards', icon: Building2 },
  { id: 'investments', label: 'Investments & mutual funds', icon: TrendingUp },
  { id: 'account', label: 'Account & billing', icon: Settings },
]
