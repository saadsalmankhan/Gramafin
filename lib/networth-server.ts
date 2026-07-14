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
import { computeNetWorth, NetWorthBreakdown } from '@/lib/networth'
import { AppState, DEFAULT_BUDGETS, DEFAULT_PREFERENCES } from '@/types'
import { today } from '@/lib/utils'

// Accepts either the top-level `db` or an active `db.transaction(tx => ...)`
// handle — both expose the same query-builder surface, this just avoids
// naming Drizzle's internal NeonDatabase/NeonTransaction types explicitly.
type Queryable = Pick<typeof db, 'select' | 'insert'>

// Reads every net-worth-relevant table for one user and recomputes+upserts
// today's snapshot, reusing the exact same computeNetWorth() the client used
// against the old Redis blob — no parallel SQL aggregate to drift from it.
// Called inline at the end of every mutating endpoint that touches a
// net-worth-relevant table; cheap at this row count, no separate job needed.
export async function recomputeAndUpsertNetWorth(tx: Queryable, userId: string): Promise<NetWorthBreakdown> {
  const [assetRows, investmentRows, mutualFundRows, bankAccountRows, incomeRows, expenseRows] = await Promise.all([
    tx.select().from(schema.assets).where(eq(schema.assets.userId, userId)),
    tx.select().from(schema.investments).where(eq(schema.investments.userId, userId)),
    tx.select().from(schema.mutualFunds).where(eq(schema.mutualFunds.userId, userId)),
    tx.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.userId, userId)),
    tx.select().from(schema.incomes).where(eq(schema.incomes.userId, userId)),
    tx.select().from(schema.expenses).where(eq(schema.expenses.userId, userId)),
  ])

  // computeNetWorth() only reads the six fields populated below — the rest
  // are stubbed with harmless defaults rather than fought with a type cast.
  const state: AppState = {
    assets: assetRows.map(assetFromRow),
    investments: investmentRows.map(investmentFromRow),
    mutualFunds: mutualFundRows.map(mutualFundFromRow),
    bankAccounts: bankAccountRows.map(bankAccountFromRow),
    incomes: incomeRows.map(incomeFromRow),
    expenses: expenseRows.map(expenseFromRow),
    budgets: DEFAULT_BUDGETS,
    recurringIncomes: [],
    netWorthHistory: [],
    preferences: DEFAULT_PREFERENCES,
  }

  const breakdown = computeNetWorth(state)

  await tx
    .insert(schema.netWorthSnapshots)
    .values({ userId, date: today(), value: breakdown.netWorth })
    .onConflictDoUpdate({
      target: [schema.netWorthSnapshots.userId, schema.netWorthSnapshots.date],
      set: { value: breakdown.netWorth },
    })

  return breakdown
}
