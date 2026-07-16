import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { bankAccountFromRow, expenseFromRow } from '@/db/mappers'
import { recomputeAndUpsertNetWorth } from '@/lib/networth-server'
import { bankAccountLabel, Expense, BankAccount, ExpenseCategory } from '@/types'
import { NetWorthBreakdown } from '@/lib/networth'

type Queryable = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>

export interface CreateExpenseInput {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  date: string
  receiptUrl?: string | null
  account?: string | null
}

export interface ExpenseMutationResult {
  expense: Expense
  bankAccount: BankAccount | null
  netWorth: NetWorthBreakdown
}

// Shared by the REST route (app/api/expenses/route.ts) and the MCP
// add_expense tool, so both go through the exact same account-matching and
// balance-sync logic rather than two implementations that could drift.
export async function createExpenseForUser(
  tx: Queryable,
  userId: string,
  input: CreateExpenseInput
): Promise<ExpenseMutationResult> {
  const account = input.account ?? null

  // Match the account label to a real bank account, same approach as the
  // recurring-income deposit sweep in lib/income.ts. Unlike that sweep,
  // Credit Card accounts are a valid match target here — an expense is
  // exactly the "charged to a card" case that sweep never has to handle.
  let deductedFromAccountId: string | null = null
  let updatedBankAccount: typeof schema.bankAccounts.$inferSelect | null = null
  if (account) {
    const bankAccountRows = await tx.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.userId, userId))
    const matched = bankAccountRows.map(bankAccountFromRow).find(b => bankAccountLabel(b) === account)
    if (matched) {
      deductedFromAccountId = matched.id
      // Credit Card balances use an inverted sign (positive = owed), so a
      // charge increases it; Checking/Saving balances are cash, so a charge
      // decreases it.
      const delta = matched.type === 'Credit Card' ? input.amount : -input.amount
      ;[updatedBankAccount] = await tx
        .update(schema.bankAccounts)
        .set({ startingBalance: matched.startingBalance + delta })
        .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, matched.id)))
        .returning()
    }
  }

  const [row] = await tx
    .insert(schema.expenses)
    .values({
      userId,
      id: input.id,
      description: input.description,
      amount: input.amount,
      category: input.category,
      date: input.date,
      receiptUrl: input.receiptUrl ?? null,
      account,
      deductedFromAccountId,
    })
    .returning()

  const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
  return {
    expense: expenseFromRow(row),
    bankAccount: updatedBankAccount ? bankAccountFromRow(updatedBankAccount) : null,
    netWorth,
  }
}

export interface DeleteExpenseResult {
  bankAccount: BankAccount | null
  netWorth: NetWorthBreakdown
  deleted: boolean
}

export async function deleteExpenseForUser(tx: Queryable, userId: string, expenseId: string): Promise<DeleteExpenseResult> {
  const [deleted] = await tx
    .delete(schema.expenses)
    .where(and(eq(schema.expenses.userId, userId), eq(schema.expenses.id, expenseId)))
    .returning()

  // Reverse the balance change this expense made when it was added — same
  // sign logic as createExpenseForUser, inverted. If the linked account was
  // itself deleted since, deductedFromAccountId is already null (the FK's
  // ON DELETE SET NULL), so there's nothing to reverse into.
  let updatedBankAccount: typeof schema.bankAccounts.$inferSelect | null = null
  if (deleted?.deductedFromAccountId) {
    const [account] = await tx
      .select()
      .from(schema.bankAccounts)
      .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, deleted.deductedFromAccountId)))
      .limit(1)
    if (account) {
      const delta = account.type === 'Credit Card' ? -deleted.amount : deleted.amount
      ;[updatedBankAccount] = await tx
        .update(schema.bankAccounts)
        .set({ startingBalance: account.startingBalance + delta })
        .where(and(eq(schema.bankAccounts.userId, userId), eq(schema.bankAccounts.id, account.id)))
        .returning()
    }
  }

  const netWorth = await recomputeAndUpsertNetWorth(tx, userId)
  return {
    bankAccount: updatedBankAccount ? bankAccountFromRow(updatedBankAccount) : null,
    netWorth,
    deleted: Boolean(deleted),
  }
}
