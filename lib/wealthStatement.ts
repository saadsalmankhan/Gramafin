import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import {
  assetFromRow,
  bankAccountFromRow,
  expenseFromRow,
  incomeFromRow,
  investmentFromRow,
  mutualFundFromRow,
} from '@/db/mappers'
import { computeNetWorth } from '@/lib/networth'
import { AppState, DEFAULT_BUDGETS, DEFAULT_PREFERENCES, DEFAULT_REFERRAL_SUMMARY, ExpenseCategory, EXPENSE_CATEGORIES } from '@/types'
import type { WealthStatementData } from '@/lib/pdf/WealthStatementDocument'

// Reuses the exact same tables/mapping as recomputeAndUpsertNetWorth (see
// lib/networth-server.ts) rather than a second parallel query set — this one
// just also keeps the raw rows around to build the statement's per-section
// tables, instead of throwing them away after computeNetWorth() runs.
export async function buildWealthStatementData(userId: string, userName: string, month: string): Promise<WealthStatementData> {
  const [assetRows, investmentRows, mutualFundRows, bankAccountRows, incomeRows, expenseRows, budgetRows] = await Promise.all([
    db.select().from(schema.assets).where(eq(schema.assets.userId, userId)),
    db.select().from(schema.investments).where(eq(schema.investments.userId, userId)),
    db.select().from(schema.mutualFunds).where(eq(schema.mutualFunds.userId, userId)),
    db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.userId, userId)),
    db.select().from(schema.incomes).where(eq(schema.incomes.userId, userId)),
    db.select().from(schema.expenses).where(eq(schema.expenses.userId, userId)),
    db.select().from(schema.budgetLimits).where(eq(schema.budgetLimits.userId, userId)),
  ])

  const assets = assetRows.map(assetFromRow)
  const investments = investmentRows.map(investmentFromRow)
  const mutualFunds = mutualFundRows.map(mutualFundFromRow)
  const bankAccounts = bankAccountRows.map(bankAccountFromRow)
  const incomes = incomeRows.map(incomeFromRow)
  const expenses = expenseRows.map(expenseFromRow)

  const state: AppState = {
    assets,
    investments,
    mutualFunds,
    bankAccounts,
    incomes,
    expenses,
    budgets: DEFAULT_BUDGETS,
    recurringIncomes: [],
    netWorthHistory: [],
    preferences: DEFAULT_PREFERENCES,
    referrals: DEFAULT_REFERRAL_SUMMARY,
  }
  const netWorth = computeNetWorth(state)

  const monthExpenseRows = expenses.filter(e => e.date.startsWith(month))
  const spendByCategory = new Map<ExpenseCategory, number>()
  for (const e of monthExpenseRows) {
    spendByCategory.set(e.category, (spendByCategory.get(e.category) ?? 0) + e.amount)
  }
  const monthExpenses = EXPENSE_CATEGORIES.map(category => ({ category, amount: spendByCategory.get(category) ?? 0 })).filter(
    e => e.amount > 0
  )
  const monthExpenseTotal = monthExpenseRows.reduce((s, e) => s + e.amount, 0)
  const monthIncome = incomes.filter(i => i.date.startsWith(month))

  const budgets = budgetRows.map(b => ({
    category: b.category,
    limit: b.amount,
    spent: spendByCategory.get(b.category as ExpenseCategory) ?? 0,
  }))

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const generatedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return {
    userName,
    monthLabel,
    generatedAt,
    netWorth,
    bankAccounts,
    assets,
    investments,
    mutualFunds,
    monthExpenses,
    monthExpenseTotal,
    monthIncome,
    budgets,
  }
}
