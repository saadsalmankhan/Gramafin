import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import {
  assetFromRow,
  expenseFromRow,
  investmentFromRow,
  mutualFundFromRow,
  netWorthSnapshotFromRow,
} from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { runRecurringIncomeSweep } from '@/lib/recurring-sweep'
import { requireUserId } from '@/lib/api-auth'
import { AppState, Budgets, DEFAULT_BUDGETS, DEFAULT_PREFERENCES, ExpenseCategory } from '@/types'
import { today } from '@/lib/utils'

// Replaces the old whole-blob GET /api/data. One transaction: catch up any
// due recurring income (the same applyDueIncome() the client used to run on
// every load, now run here so it only ever happens once, coherently, before
// anything is read), recompute net worth, then assemble the exact AppState
// shape the client has always hydrated from.
export async function GET() {
  const auth = await requireUserId()
  if (auth.error) return auth.error
  const { userId } = auth

  const data = await db.transaction(async (tx) => {
    const result = await runRecurringIncomeSweep(tx, userId)

    const [assetRows, investmentRows, mutualFundRows, expenseRows, budgetRows, prefRows, snapshotRows] =
      await Promise.all([
        tx.select().from(schema.assets).where(eq(schema.assets.userId, userId)),
        tx.select().from(schema.investments).where(eq(schema.investments.userId, userId)),
        tx.select().from(schema.mutualFunds).where(eq(schema.mutualFunds.userId, userId)),
        tx.select().from(schema.expenses).where(eq(schema.expenses.userId, userId)),
        tx.select().from(schema.budgetLimits).where(eq(schema.budgetLimits.userId, userId)),
        tx.select().from(schema.preferences).where(eq(schema.preferences.userId, userId)).limit(1),
        tx
          .select()
          .from(schema.netWorthSnapshots)
          .where(eq(schema.netWorthSnapshots.userId, userId))
          .orderBy(schema.netWorthSnapshots.date),
      ])

    const budgets: Budgets = { ...DEFAULT_BUDGETS }
    for (const row of budgetRows) {
      budgets[row.category as ExpenseCategory] = row.amount
    }

    const breakdown = await recomputeAndUpsertNetWorth(tx, userId)

    // recomputeAndUpsertNetWorth already wrote today's snapshot to the DB —
    // merge it into the just-fetched history in memory (same in-place-update
    // semantics as the old client-side upsertNetWorthSnapshot) rather than
    // re-querying.
    const history = snapshotRows.map(netWorthSnapshotFromRow)
    const t = today()
    const last = history[history.length - 1]
    const netWorthHistory =
      last?.date === t
        ? [...history.slice(0, -1), { date: t, value: breakdown.netWorth }]
        : [...history, { date: t, value: breakdown.netWorth }]

    const state: AppState = {
      expenses: expenseRows.map(expenseFromRow),
      assets: assetRows.map(assetFromRow),
      investments: investmentRows.map(investmentFromRow),
      mutualFunds: mutualFundRows.map(mutualFundFromRow),
      budgets,
      incomes: result.incomes,
      recurringIncomes: result.recurring,
      bankAccounts: result.bankAccounts,
      netWorthHistory,
      preferences: prefRows[0]
        ? { currency: prefRows[0].currency as AppState['preferences']['currency'], stockMarket: prefRows[0].stockMarket as AppState['preferences']['stockMarket'] }
        : DEFAULT_PREFERENCES,
    }

    return state
  })

  return NextResponse.json({ data })
}
