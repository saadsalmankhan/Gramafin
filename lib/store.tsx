'use client'

import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import {
  AppState,
  Expense,
  Asset,
  Investment,
  MutualFund,
  ExpenseCategory,
  RecurringIncome,
  Income,
  BankAccount,
  DEFAULT_BUDGETS,
  Preferences,
  DEFAULT_PREFERENCES,
  CURRENCIES,
  NetWorthSnapshot,
} from '@/types'
import { NetWorthBreakdown } from '@/lib/networth'
import { today, setCurrencySymbol } from '@/lib/utils'

const initialState: AppState = {
  expenses: [],
  assets: [],
  investments: [],
  mutualFunds: [],
  budgets: DEFAULT_BUDGETS,
  incomes: [],
  recurringIncomes: [],
  bankAccounts: [],
  netWorthHistory: [],
  preferences: DEFAULT_PREFERENCES,
}

// Keeps a running daily history of net worth so it can be charted over time,
// updating today's entry in place rather than appending on every action —
// mirrors the value the server just recomputed and returned.
function upsertHistory(history: NetWorthSnapshot[], value: number): NetWorthSnapshot[] {
  const t = today()
  const last = history[history.length - 1]
  if (last && last.date === t) {
    return last.value === value ? history : [...history.slice(0, -1), { date: t, value }]
  }
  return [...history, { date: t, value }]
}

async function readJson<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error((body && typeof body.error === 'string' && body.error) || fallbackError)
  }
  return res.json()
}

interface StoreCtx {
  state: AppState
  hydrated: boolean
  syncError: boolean
  addExpense: (expense: Expense) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  addAsset: (asset: Asset) => Promise<void>
  deleteAsset: (id: string) => Promise<void>
  addInvestment: (investment: Investment) => Promise<void>
  updateInvestment: (investment: Investment) => Promise<void>
  deleteInvestment: (id: string) => Promise<void>
  addMutualFund: (fund: MutualFund) => Promise<void>
  updateMutualFund: (fund: MutualFund) => Promise<void>
  deleteMutualFund: (id: string) => Promise<void>
  setBudget: (category: ExpenseCategory, amount: number) => Promise<void>
  addRecurringIncome: (recurring: RecurringIncome) => Promise<void>
  deleteRecurringIncome: (id: string) => Promise<void>
  addIncome: (income: Income) => Promise<void>
  deleteIncome: (id: string) => Promise<void>
  addBankAccount: (account: BankAccount) => Promise<void>
  deleteBankAccount: (id: string) => Promise<void>
  payBankAccountCard: (cardId: string, amount: number, fromAccountId: string | null) => Promise<void>
  setPreferences: (prefs: Partial<Preferences>) => Promise<void>
}

const StoreContext = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const userId = session?.user?.id

  const [state, setState] = useState<AppState>(initialState)
  const [hydrated, setHydrated] = useState(false)
  const [syncError, setSyncError] = useState(false)

  // Keep fmt()/fmtCompact()'s currency symbol in sync with the saved
  // preference. Set synchronously during render (not in a useEffect) so
  // descendants — which render after this in the same pass — pick up the
  // new symbol immediately. An effect would run one commit too late: it
  // fires after children have already rendered with the stale symbol, and
  // mutating a plain variable doesn't trigger the second render needed to
  // pick up the fix.
  setCurrencySymbol(CURRENCIES.find(c => c.code === state.preferences.currency)?.symbol ?? 'Rs')

  // Load this user's data from the server after auth resolves. Runs once —
  // the recurring-income catch-up sweep that used to happen client-side on
  // every load now happens inside GET /api/bootstrap itself.
  useEffect(() => {
    if (status !== 'authenticated' || !userId) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/bootstrap')
        if (!res.ok) throw new Error(`Failed to load data (${res.status})`)
        const { data } = (await res.json()) as { data: AppState }
        if (!cancelled) {
          setState(data)
          setSyncError(false)
        }
      } catch (err) {
        console.error('Failed to load data:', err)
        if (!cancelled) setSyncError(true)
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [status, userId])

  // Every mutating action follows the same shape: apply an optimistic update
  // immediately, fire the request, and either merge the server's freshly
  // recomputed net worth in (success) or run `revert` (failure). Both apply
  // and revert go through functional setState so they always operate on the
  // latest state rather than a snapshot captured at call time — safe even if
  // another action lands while this one's request is still in flight.
  const mutate = useCallback(
    async <T extends { netWorth: NetWorthBreakdown }>(
      apply: (s: AppState) => AppState,
      revert: (s: AppState) => AppState,
      request: () => Promise<T>
    ): Promise<T | undefined> => {
      setState(apply)
      try {
        const result = await request()
        setState(s => ({ ...s, netWorthHistory: upsertHistory(s.netWorthHistory, result.netWorth.netWorth) }))
        setSyncError(false)
        return result
      } catch (err) {
        console.error('Failed to save:', err)
        setState(revert)
        setSyncError(true)
        return undefined
      }
    },
    []
  )

  const addExpense = useCallback(
    (expense: Expense) =>
      mutate(
        s => ({ ...s, expenses: [expense, ...s.expenses] }),
        s => ({ ...s, expenses: s.expenses.filter(e => e.id !== expense.id) }),
        async () => {
          const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expense),
          })
          return readJson<{ expense: Expense; netWorth: NetWorthBreakdown }>(res, 'Failed to add expense')
        }
      ).then(() => undefined),
    [mutate]
  )

  const deleteExpense = useCallback(
    (id: string) => {
      let removed: Expense | undefined
      return mutate(
        s => {
          removed = s.expenses.find(e => e.id === id)
          return { ...s, expenses: s.expenses.filter(e => e.id !== id) }
        },
        s => (removed ? { ...s, expenses: [removed, ...s.expenses] } : s),
        async () => {
          const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
          return readJson<{ netWorth: NetWorthBreakdown }>(res, 'Failed to delete expense')
        }
      ).then(() => undefined)
    },
    [mutate]
  )

  const addAsset = useCallback(
    (asset: Asset) =>
      mutate(
        s => ({ ...s, assets: [asset, ...s.assets] }),
        s => ({ ...s, assets: s.assets.filter(a => a.id !== asset.id) }),
        async () => {
          const res = await fetch('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(asset),
          })
          return readJson<{ asset: Asset; netWorth: NetWorthBreakdown }>(res, 'Failed to add asset')
        }
      ).then(() => undefined),
    [mutate]
  )

  const deleteAsset = useCallback(
    (id: string) => {
      let removed: Asset | undefined
      return mutate(
        s => {
          removed = s.assets.find(a => a.id === id)
          return { ...s, assets: s.assets.filter(a => a.id !== id) }
        },
        s => (removed ? { ...s, assets: [removed, ...s.assets] } : s),
        async () => {
          const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
          return readJson<{ netWorth: NetWorthBreakdown }>(res, 'Failed to delete asset')
        }
      ).then(() => undefined)
    },
    [mutate]
  )

  const addInvestment = useCallback(
    (investment: Investment) =>
      mutate(
        s => ({ ...s, investments: [investment, ...s.investments] }),
        s => ({ ...s, investments: s.investments.filter(i => i.id !== investment.id) }),
        async () => {
          const res = await fetch('/api/investments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(investment),
          })
          return readJson<{ investment: Investment; netWorth: NetWorthBreakdown }>(res, 'Failed to add investment')
        }
      ).then(() => undefined),
    [mutate]
  )

  const updateInvestment = useCallback(
    (investment: Investment) => {
      let prev: Investment | undefined
      return mutate(
        s => {
          prev = s.investments.find(i => i.id === investment.id)
          return { ...s, investments: s.investments.map(i => (i.id === investment.id ? investment : i)) }
        },
        s => (prev ? { ...s, investments: s.investments.map(i => (i.id === investment.id ? prev! : i)) } : s),
        async () => {
          const res = await fetch(`/api/investments/${investment.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(investment),
          })
          return readJson<{ investment: Investment; netWorth: NetWorthBreakdown }>(
            res,
            'Failed to update investment'
          )
        }
      ).then(() => undefined)
    },
    [mutate]
  )

  const deleteInvestment = useCallback(
    (id: string) => {
      let removed: Investment | undefined
      return mutate(
        s => {
          removed = s.investments.find(i => i.id === id)
          return { ...s, investments: s.investments.filter(i => i.id !== id) }
        },
        s => (removed ? { ...s, investments: [removed, ...s.investments] } : s),
        async () => {
          const res = await fetch(`/api/investments/${id}`, { method: 'DELETE' })
          return readJson<{ netWorth: NetWorthBreakdown }>(res, 'Failed to delete investment')
        }
      ).then(() => undefined)
    },
    [mutate]
  )

  const addMutualFund = useCallback(
    (fund: MutualFund) =>
      mutate(
        s => ({ ...s, mutualFunds: [fund, ...s.mutualFunds] }),
        s => ({ ...s, mutualFunds: s.mutualFunds.filter(f => f.id !== fund.id) }),
        async () => {
          const res = await fetch('/api/mutual-funds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fund),
          })
          return readJson<{ mutualFund: MutualFund; netWorth: NetWorthBreakdown }>(
            res,
            'Failed to add mutual fund'
          )
        }
      ).then(() => undefined),
    [mutate]
  )

  const updateMutualFund = useCallback(
    (fund: MutualFund) => {
      let prev: MutualFund | undefined
      return mutate(
        s => {
          prev = s.mutualFunds.find(f => f.id === fund.id)
          return { ...s, mutualFunds: s.mutualFunds.map(f => (f.id === fund.id ? fund : f)) }
        },
        s => (prev ? { ...s, mutualFunds: s.mutualFunds.map(f => (f.id === fund.id ? prev! : f)) } : s),
        async () => {
          const res = await fetch(`/api/mutual-funds/${fund.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fund),
          })
          return readJson<{ mutualFund: MutualFund; netWorth: NetWorthBreakdown }>(
            res,
            'Failed to update mutual fund'
          )
        }
      ).then(() => undefined)
    },
    [mutate]
  )

  const deleteMutualFund = useCallback(
    (id: string) => {
      let removed: MutualFund | undefined
      return mutate(
        s => {
          removed = s.mutualFunds.find(f => f.id === id)
          return { ...s, mutualFunds: s.mutualFunds.filter(f => f.id !== id) }
        },
        s => (removed ? { ...s, mutualFunds: [removed, ...s.mutualFunds] } : s),
        async () => {
          const res = await fetch(`/api/mutual-funds/${id}`, { method: 'DELETE' })
          return readJson<{ netWorth: NetWorthBreakdown }>(res, 'Failed to delete mutual fund')
        }
      ).then(() => undefined)
    },
    [mutate]
  )

  const setBudget = useCallback(
    (category: ExpenseCategory, amount: number) => {
      let prev: number | undefined
      return mutate(
        s => {
          prev = s.budgets[category]
          return { ...s, budgets: { ...s.budgets, [category]: amount } }
        },
        s => (prev !== undefined ? { ...s, budgets: { ...s.budgets, [category]: prev } } : s),
        async () => {
          const res = await fetch(`/api/budgets/${encodeURIComponent(category)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount }),
          })
          return readJson<{ netWorth: NetWorthBreakdown }>(res, 'Failed to update budget')
        }
      ).then(() => undefined)
    },
    [mutate]
  )

  // Not run through the optimistic mutate() helper — the server-side catch-up
  // sweep (see lib/recurring-sweep.ts) can generate multiple new income
  // entries and shift bank balances in ways too complex to predict correctly
  // client-side, so this waits for the real response and applies it exactly.
  const addRecurringIncome = useCallback(async (recurring: RecurringIncome) => {
    try {
      const res = await fetch('/api/recurring-incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recurring),
      })
      const result = await readJson<{
        recurringIncome: RecurringIncome
        incomes: Income[]
        bankAccounts: BankAccount[]
        netWorth: NetWorthBreakdown
      }>(res, 'Failed to add recurring income')

      setState(s => ({
        ...s,
        recurringIncomes: [...s.recurringIncomes.filter(r => r.id !== result.recurringIncome.id), result.recurringIncome],
        incomes: result.incomes,
        bankAccounts: result.bankAccounts,
        netWorthHistory: upsertHistory(s.netWorthHistory, result.netWorth.netWorth),
      }))
      setSyncError(false)
    } catch (err) {
      console.error('Failed to add recurring income:', err)
      setSyncError(true)
    }
  }, [])

  const deleteRecurringIncome = useCallback(
    (id: string) => {
      let removed: RecurringIncome | undefined
      return mutate(
        s => {
          removed = s.recurringIncomes.find(r => r.id === id)
          return { ...s, recurringIncomes: s.recurringIncomes.filter(r => r.id !== id) }
        },
        s => (removed ? { ...s, recurringIncomes: [...s.recurringIncomes, removed] } : s),
        async () => {
          const res = await fetch(`/api/recurring-incomes/${id}`, { method: 'DELETE' })
          return readJson<{ netWorth: NetWorthBreakdown }>(res, 'Failed to delete recurring income')
        }
      ).then(() => undefined)
    },
    [mutate]
  )

  const addIncome = useCallback(
    (income: Income) =>
      mutate(
        s => ({ ...s, incomes: [income, ...s.incomes] }),
        s => ({ ...s, incomes: s.incomes.filter(i => i.id !== income.id) }),
        async () => {
          const res = await fetch('/api/incomes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(income),
          })
          return readJson<{ income: Income; netWorth: NetWorthBreakdown }>(res, 'Failed to add income')
        }
      ).then(() => undefined),
    [mutate]
  )

  const deleteIncome = useCallback(
    (id: string) => {
      let removed: Income | undefined
      return mutate(
        s => {
          removed = s.incomes.find(i => i.id === id)
          return { ...s, incomes: s.incomes.filter(i => i.id !== id) }
        },
        s => (removed ? { ...s, incomes: [removed, ...s.incomes] } : s),
        async () => {
          const res = await fetch(`/api/incomes/${id}`, { method: 'DELETE' })
          return readJson<{ netWorth: NetWorthBreakdown }>(res, 'Failed to delete income')
        }
      ).then(() => undefined)
    },
    [mutate]
  )

  const addBankAccount = useCallback(
    (account: BankAccount) =>
      mutate(
        s => ({ ...s, bankAccounts: [...s.bankAccounts, account] }),
        s => ({ ...s, bankAccounts: s.bankAccounts.filter(b => b.id !== account.id) }),
        async () => {
          const res = await fetch('/api/bank-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(account),
          })
          return readJson<{ bankAccount: BankAccount; netWorth: NetWorthBreakdown }>(
            res,
            'Failed to add bank account'
          )
        }
      ).then(() => undefined),
    [mutate]
  )

  const deleteBankAccount = useCallback(
    (id: string) => {
      let removed: BankAccount | undefined
      let affectedIncomeIds: string[] = []
      return mutate(
        s => {
          removed = s.bankAccounts.find(b => b.id === id)
          affectedIncomeIds = s.incomes.filter(i => i.depositedToAccountId === id).map(i => i.id)
          return {
            ...s,
            bankAccounts: s.bankAccounts.filter(b => b.id !== id),
            // The DB's incomes.deposited_to_account_id FK is ON DELETE SET
            // NULL — mirror that here so the account balance / net-savings
            // double-counting exclusion updates immediately rather than only
            // after the next full reload. See types/index.ts's comment on
            // depositedToAccountId for why this matters.
            incomes: s.incomes.map(i => (i.depositedToAccountId === id ? { ...i, depositedToAccountId: undefined } : i)),
          }
        },
        s => ({
          ...s,
          bankAccounts: removed ? [...s.bankAccounts, removed] : s.bankAccounts,
          incomes: s.incomes.map(i => (affectedIncomeIds.includes(i.id) ? { ...i, depositedToAccountId: id } : i)),
        }),
        async () => {
          const res = await fetch(`/api/bank-accounts/${id}`, { method: 'DELETE' })
          return readJson<{ netWorth: NetWorthBreakdown }>(res, 'Failed to delete bank account')
        }
      ).then(() => undefined)
    },
    [mutate]
  )

  const payBankAccountCard = useCallback(
    (cardId: string, amount: number, fromAccountId: string | null) => {
      let prevCard: BankAccount | undefined
      let prevFromAccount: BankAccount | undefined
      return mutate(
        s => {
          prevCard = s.bankAccounts.find(b => b.id === cardId)
          prevFromAccount = fromAccountId ? s.bankAccounts.find(b => b.id === fromAccountId) : undefined
          return {
            ...s,
            bankAccounts: s.bankAccounts.map(b => {
              if (b.id === cardId) return { ...b, startingBalance: b.startingBalance - amount }
              if (fromAccountId && b.id === fromAccountId) return { ...b, startingBalance: b.startingBalance - amount }
              return b
            }),
          }
        },
        s => ({
          ...s,
          bankAccounts: s.bankAccounts.map(b => {
            if (prevCard && b.id === cardId) return prevCard
            if (prevFromAccount && b.id === fromAccountId) return prevFromAccount
            return b
          }),
        }),
        async () => {
          const res = await fetch(`/api/bank-accounts/${cardId}/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, fromAccountId }),
          })
          return readJson<{ bankAccount: BankAccount; fromAccount: BankAccount | null; netWorth: NetWorthBreakdown }>(
            res,
            'Failed to process payment'
          )
        }
      ).then(() => undefined)
    },
    [mutate]
  )

  // Doesn't affect net worth, so this skips the netWorthHistory-merging
  // mutate() helper and does its own minimal optimistic-update + rollback.
  const setPreferences = useCallback(async (prefs: Partial<Preferences>) => {
    let prev: Preferences | undefined
    setState(s => {
      prev = s.preferences
      return { ...s, preferences: { ...s.preferences, ...prefs } }
    })
    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      await readJson(res, 'Failed to update preferences')
      setSyncError(false)
    } catch (err) {
      console.error('Failed to update preferences:', err)
      setState(s => (prev ? { ...s, preferences: prev! } : s))
      setSyncError(true)
    }
  }, [])

  return (
    <StoreContext.Provider
      value={{
        state,
        hydrated,
        syncError,
        addExpense,
        deleteExpense,
        addAsset,
        deleteAsset,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        addMutualFund,
        updateMutualFund,
        deleteMutualFund,
        setBudget,
        addRecurringIncome,
        deleteRecurringIncome,
        addIncome,
        deleteIncome,
        addBankAccount,
        deleteBankAccount,
        payBankAccountCard,
        setPreferences,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export function useThisMonth() {
  const { state } = useStore()
  const month = new Date().toISOString().slice(0, 7)
  return state.expenses.filter(e => e.date.startsWith(month))
}
