import { Income, IncomeFrequency, RecurringIncome } from '@/types'
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
// until the next period is due.
export function applyDueIncome(
  recurring: RecurringIncome[],
  existingIncomes: Income[]
): { incomes: Income[]; recurring: RecurringIncome[] } {
  const now = today()
  const generated: Income[] = []

  const updatedRecurring = recurring.map(r => {
    let nextDate = r.nextDate
    while (nextDate <= now) {
      generated.push({
        id: uid(),
        source: r.source,
        amount: r.amount,
        date: nextDate,
        recurringId: r.id,
      })
      nextDate = advanceDate(nextDate, r.frequency)
    }
    return nextDate === r.nextDate ? r : { ...r, nextDate }
  })

  return {
    incomes: generated.length ? [...generated, ...existingIncomes] : existingIncomes,
    recurring: updatedRecurring,
  }
}
