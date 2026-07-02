export type ExpenseCategory =
  | 'Food & Dining'
  | 'Transport'
  | 'Utilities & Bills'
  | 'Shopping'
  | 'Health'
  | 'Entertainment'
  | 'Education'
  | 'Custom'

export type AssetCategory =
  | 'Cash / Bank'
  | 'Real estate'
  | 'Stocks'
  | 'Mutual funds'
  | 'Gold / Jewelry'
  | 'Tangible assets'
  | 'Credit card'
  | 'Liability'

export type InvestmentType =
  | 'Stocks'
  | 'Crypto'
  | 'Bonds'
  | 'Other'

export type MutualFundType =
  | 'Money Market'
  | 'Equity'
  | 'Income'
  | 'Balanced'
  | 'Index'
  | 'Islamic'
  | 'Other'

export interface MutualFund {
  id: string
  name: string
  fundType: MutualFundType
  unitsHeld: number
  buyNav: number          // PKR per unit at purchase
  currentNav: number      // PKR per unit now (manually overridable)
  navOverride: number | null  // manual fallback if fetch fails
  lastUpdated: string | null  // ISO date of last NAV update
  realizedGains: number   // from units already sold
  notes: string
}

export const MUTUAL_FUND_TYPES: MutualFundType[] = [
  'Money Market',
  'Equity',
  'Income',
  'Balanced',
  'Index',
  'Islamic',
  'Other',
]

export interface Expense {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  date: string
  receiptUrl?: string
}

export interface Asset {
  id: string
  name: string
  value: number
  category: AssetCategory
  // Credit card only
  creditLimit?: number
  dueDate?: string        // ISO date of next payment due
  minimumPayment?: number
}

export const LIABILITY_CATEGORIES: AssetCategory[] = ['Liability', 'Credit card']

export function isLiabilityCategory(category: AssetCategory): boolean {
  return LIABILITY_CATEGORIES.includes(category)
}

export interface Investment {
  id: string
  name: string
  type: InvestmentType
  amountInvested: number
  currentValue: number
}

export type Budgets = Record<ExpenseCategory, number>

export interface AppState {
  expenses: Expense[]
  assets: Asset[]
  investments: Investment[]
  mutualFunds: MutualFund[]
  budgets: Budgets
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food & Dining',
  'Transport',
  'Utilities & Bills',
  'Shopping',
  'Health',
  'Entertainment',
  'Education',
  'Custom',
]

export const ASSET_CATEGORIES: AssetCategory[] = [
  'Cash / Bank',
  'Real estate',
  'Stocks',
  'Mutual funds',
  'Gold / Jewelry',
  'Tangible assets',
  'Credit card',
  'Liability',
]

export const INVESTMENT_TYPES: InvestmentType[] = [
  'Stocks',
  'Crypto',
  'Bonds',
  'Other',
]

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Food & Dining':    '#2a78d6',
  'Transport':        '#1baf7a',
  'Utilities & Bills':'#eda100',
  'Shopping':         '#4a3aa7',
  'Health':           '#e34948',
  'Entertainment':    '#e87ba4',
  'Education':        '#eb6834',
  'Custom':           '#73726c',
}

export const DEFAULT_BUDGETS: Budgets = {
  'Food & Dining':     50000,
  'Transport':         20000,
  'Utilities & Bills': 30000,
  'Shopping':          25000,
  'Health':            15000,
  'Entertainment':     10000,
  'Education':         20000,
  'Custom':            10000,
}
