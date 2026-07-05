import { AppState, isLiabilityCategory } from '@/types'

export interface NetWorthBreakdown {
  cashAndAssets: number
  bankAccounts: number
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
  const assetLiabilities = state.assets
    .filter(a => isLiabilityCategory(a.category))
    .reduce((s, a) => s + a.value, 0)

  // Checking/Saving balances are cash. A credit card balance is entered with
  // an inverted sign (see Settings): positive means the user owes money (a
  // liability), negative means they've overpaid and the card owes them back
  // (a cash-equivalent credit), matching the convention shown in Settings.
  const bankAccounts = state.bankAccounts.reduce((s, b) => {
    if (b.type === 'Credit Card') return b.startingBalance < 0 ? s + Math.abs(b.startingBalance) : s
    return s + b.startingBalance
  }, 0)
  const creditCardDebt = state.bankAccounts
    .filter(b => b.type === 'Credit Card' && b.startingBalance > 0)
    .reduce((s, b) => s + b.startingBalance, 0)
  const liabilities = assetLiabilities + creditCardDebt

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
    bankAccounts,
    investments,
    mutualFunds,
    netSavings,
    liabilities,
    netWorth: cashAndAssets + bankAccounts + investments + mutualFunds + netSavings - liabilities,
  }
}
