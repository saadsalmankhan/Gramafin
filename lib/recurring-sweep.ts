import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { bankAccountFromRow, incomeFromRow, recurringIncomeFromRow } from '@/db/mappers'
import { applyDueIncome } from '@/lib/income'
import { BankAccount, Income, RecurringIncome } from '@/types'

type Queryable = Pick<typeof db, 'select' | 'insert' | 'update'>

export interface SweepResult {
  incomes: Income[]
  recurring: RecurringIncome[]
  bankAccounts: BankAccount[]
}

// Runs the exact same catch-up applyDueIncome() the client used to run on
// every load, now server-side. Used by GET /api/bootstrap (every load) and
// POST /api/recurring-incomes (adding a rule whose nextDate is already in
// the past should generate its catch-up entries immediately, matching the
// old reducer's ADD_RECURRING_INCOME behavior) — re-sweeping rules that are
// already caught up is a no-op, so calling this unconditionally is safe.
export async function runRecurringIncomeSweep(tx: Queryable, userId: string): Promise<SweepResult> {
  const [recurringRows, bankAccountRows, incomeRows] = await Promise.all([
    tx.select().from(schema.recurringIncomes).where(eq(schema.recurringIncomes.userId, userId)),
    tx.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.userId, userId)),
    tx.select().from(schema.incomes).where(eq(schema.incomes.userId, userId)),
  ])

  const existingIncomes = incomeRows.map(incomeFromRow)
  const result = applyDueIncome(
    recurringRows.map(recurringIncomeFromRow),
    existingIncomes,
    bankAccountRows.map(bankAccountFromRow)
  )

  // applyDueIncome always prepends newly-generated entries onto
  // existingIncomes unchanged — the length delta is exactly the new ones.
  const newCount = result.incomes.length - existingIncomes.length
  const newIncomes = result.incomes.slice(0, newCount)

  if (newIncomes.length > 0) {
    await tx.insert(schema.incomes).values(
      newIncomes.map((i) => ({
        userId,
        id: i.id,
        source: i.source,
        category: i.category,
        amount: i.amount,
        account: i.account,
        date: i.date,
        recurringId: i.recurringId ?? null,
        depositedToAccountId: i.depositedToAccountId ?? null,
      }))
    )
  }

  for (const updated of result.recurring) {
    const original = recurringRows.find((r) => r.id === updated.id)
    if (original && original.nextDate !== updated.nextDate) {
      await tx
        .update(schema.recurringIncomes)
        .set({ nextDate: updated.nextDate })
        .where(and(eq(schema.recurringIncomes.userId, userId), eq(schema.recurringIncomes.id, updated.id)))
    }
  }

  for (const updated of result.bankAccounts) {
    const original = bankAccountRows.find((b) => b.id === updated.id)
    if (original && original.startingBalance !== updated.startingBalance) {
      await tx
        .update(schema.bankAccounts)
        .set({ startingBalance: updated.startingBalance })
        .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, updated.id)))
    }
  }

  return result
}
