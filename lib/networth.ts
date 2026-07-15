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
  // Income already deposited into a tracked bank account (see applyDueIncome
  // in lib/income.ts) is excluded here — it's counted once, via the account
  // balance above, not again via net savings. Everything else (manual
  // entries, recurring income matched to "Cash" or an unmatched label) is
  // still counted here, same as before this distinction existed.
  const totalIncome = state.incomes
    .filter(i => !i.depositedToAccountId)
    .reduce((s, i) => s + i.amount, 0)
  // Same exclusion, mirrored for expenses: one already deducted from (or
  // charged to) a real bank account was already reflected above — via a
  // lower cash balance, or higher credit card debt — so counting it again
  // here would double it. Expenses still on "Cash" or an unmatched label
  // are counted here exactly as before this distinction existed.
  const totalExpenses = state.expenses
    .filter(e => !e.deductedFromAccountId)
    .reduce((s, e) => s + e.amount, 0)
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
