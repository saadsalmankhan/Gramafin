import { BankAccount, Income, IncomeFrequency, RecurringIncome, bankAccountLabel } from '@/types'
import { today, uid } from '@/lib/utils'

export function advanceDate(date: string, frequency: IncomeFrequency): string {
  const [year, month, day] = date.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  switch (frequency) {
    case 'Weekly':
      d.setUTCDate(d.getUTCDate() + 7)
      break
    case 'Bi-weekly':
      d.setUTCDate(d.getUTCDate() + 14)
      break
    case 'Monthly':
      d.setUTCMonth(d.getUTCMonth() + 1)
      break
    case 'Quarterly':
      d.setUTCMonth(d.getUTCMonth() + 3)
      break
    case 'Yearly':
      d.setUTCFullYear(d.getUTCFullYear() + 1)
      break
  }
  return d.toISOString().slice(0, 10)
}

// Generates any income entries whose scheduled date has arrived, advancing
// each recurring rule's `nextDate` past today so re-running this is a no-op
// until the next period is due. When a recurring income's `account` label
// matches a real (non-credit-card) BankAccount, that account's balance is
// bumped by the deposited amount and the generated entry is flagged via
// `depositedToAccountId` — see that field's comment in types/index.ts for
// why computeNetWorth then excludes it from netSavings (avoids double-
// counting the same money in both the account balance and net savings).
// Falls back to the old label-only behavior (no balance change) for
// unmatched accounts, e.g. "Cash", which has no tracked balance.
export function applyDueIncome(
  recurring: RecurringIncome[],
  existingIncomes: Income[],
  bankAccounts: BankAccount[] = []
): { incomes: Income[]; recurring: RecurringIncome[]; bankAccounts: BankAccount[] } {
  const now = today()
  const generated: Income[] = []
  const balanceDeltas = new Map<string, number>()

  const matchableAccounts = bankAccounts.filter(b => b.type !== 'Credit Card')

  const updatedRecurring = recurring.map(r => {
    const matchedAccount = matchableAccounts.find(b => bankAccountLabel(b) === r.account)

    let nextDate = r.nextDate
    while (nextDate <= now) {
      generated.push({
        id: uid(),
        source: r.source,
        category: r.category,
        amount: r.amount,
        account: r.account,
        date: nextDate,
        recurringId: r.id,
        ...(matchedAccount && { depositedToAccountId: matchedAccount.id }),
      })
      if (matchedAccount) {
        balanceDeltas.set(matchedAccount.id, (balanceDeltas.get(matchedAccount.id) ?? 0) + r.amount)
      }
      nextDate = advanceDate(nextDate, r.frequency)
    }
    return nextDate === r.nextDate ? r : { ...r, nextDate }
  })

  const updatedBankAccounts = balanceDeltas.size === 0
    ? bankAccounts
    : bankAccounts.map(b => balanceDeltas.has(b.id)
        ? { ...b, startingBalance: b.startingBalance + balanceDeltas.get(b.id)! }
        : b)

  return {
    incomes: generated.length ? [...generated, ...existingIncomes] : existingIncomes,
    recurring: updatedRecurring,
    bankAccounts: updatedBankAccounts,
  }
}
