import { AppState, isLiabilityCategory } from '@/types'

export interface NetWorthBreakdown {
  cashAndAssets: number
  investments: number
  mutualFunds: number
  netSavings: number
  liabilities: number
  netWorth: number
}

export function computeNetWorth(state: AppState): NetWorthBreakdown {
  const cashAndAssets = state.assets
    .filter(a => !isLiabilityCategory(a.category))
    .reduce((s, a) => s + a.value, 0)
  const liabilities = state.assets
    .filter(a => isLiabilityCategory(a.category))
    .reduce((s, a) => s + a.value, 0)
  const investments = state.investments.reduce((s, i) => s + i.currentValue, 0)
  const mutualFunds = state.mutualFunds.reduce((s, f) => {
    const nav = f.navOverride !== null && f.navOverride > 0 ? f.navOverride : f.currentNav
    return s + f.unitsHeld * nav
  }, 0)
  const totalIncome = state.incomes.reduce((s, i) => s + i.amount, 0)
  const totalExpenses = state.expenses.reduce((s, e) => s + e.amount, 0)
  const netSavings = totalIncome - totalExpenses

  return {
    cashAndAssets,
    investments,
    mutualFunds,
    netSavings,
    liabilities,
    netWorth: cashAndAssets + investments + mutualFunds + netSavings - liabilities,
  }
}
