import {
  Asset,
  BankAccount,
  Expense,
  Income,
  Investment,
  MutualFund,
  NetWorthSnapshot,
  Preferences,
  RecurringIncome,
} from '@/types'
import * as schema from './schema'

// Every select() below returns rows keyed by the schema's own camelCase
// property names plus a `userId` that the client-facing entity shape never
// had — these strip `userId` and convert DB `null` to `undefined` exactly
// where the app's TS types don't declare `| null` as a valid value.

export function bankAccountFromRow(row: typeof schema.bankAccounts.$inferSelect): BankAccount {
  return {
    id: row.id,
    bank: row.bank,
    nickname: row.nickname,
    type: row.type as BankAccount['type'],
    startingBalance: row.startingBalance,
    dueDate: row.dueDate ?? undefined,
    creditLimit: row.creditLimit ?? undefined,
    minimumPayment: row.minimumPayment ?? undefined,
  }
}

export function expenseFromRow(row: typeof schema.expenses.$inferSelect): Expense {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    category: row.category as Expense['category'],
    date: row.date,
    receiptUrl: row.receiptUrl ?? undefined,
    account: row.account ?? undefined,
    deductedFromAccountId: row.deductedFromAccountId ?? undefined,
  }
}

export function assetFromRow(row: typeof schema.assets.$inferSelect): Asset {
  return {
    id: row.id,
    name: row.name,
    value: row.value,
    category: row.category as Asset['category'],
    creditLimit: row.creditLimit ?? undefined,
    dueDate: row.dueDate ?? undefined,
    minimumPayment: row.minimumPayment ?? undefined,
  }
}

export function investmentFromRow(row: typeof schema.investments.$inferSelect): Investment {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Investment['type'],
    amountInvested: row.amountInvested,
    currentValue: row.currentValue,
    symbol: row.symbol ?? undefined,
    sharesHeld: row.sharesHeld ?? undefined,
    buyPrice: row.buyPrice ?? undefined,
    priceOverride: row.priceOverride,
    lastPriceUpdate: row.lastPriceUpdate,
  }
}

export function mutualFundFromRow(row: typeof schema.mutualFunds.$inferSelect): MutualFund {
  return {
    id: row.id,
    name: row.name,
    fundType: row.fundType as MutualFund['fundType'],
    unitsHeld: row.unitsHeld,
    buyNav: row.buyNav,
    currentNav: row.currentNav,
    navOverride: row.navOverride,
    lastUpdated: row.lastUpdated,
    realizedGains: row.realizedGains,
    notes: row.notes,
  }
}

export function recurringIncomeFromRow(row: typeof schema.recurringIncomes.$inferSelect): RecurringIncome {
  return {
    id: row.id,
    source: row.source,
    category: row.category as RecurringIncome['category'],
    amount: row.amount,
    account: row.account,
    frequency: row.frequency as RecurringIncome['frequency'],
    nextDate: row.nextDate,
  }
}

export function incomeFromRow(row: typeof schema.incomes.$inferSelect): Income {
  return {
    id: row.id,
    source: row.source,
    category: row.category as Income['category'],
    amount: row.amount,
    account: row.account,
    date: row.date,
    recurringId: row.recurringId ?? undefined,
    depositedToAccountId: row.depositedToAccountId ?? undefined,
  }
}

export function netWorthSnapshotFromRow(row: typeof schema.netWorthSnapshots.$inferSelect): NetWorthSnapshot {
  return { date: row.date, value: row.value }
}

export function preferencesFromRow(row: typeof schema.preferences.$inferSelect): Preferences {
  return {
    currency: row.currency as Preferences['currency'],
    stockMarket: row.stockMarket as Preferences['stockMarket'],
    onboardingDismissed: row.onboardingDismissed,
  }
}
