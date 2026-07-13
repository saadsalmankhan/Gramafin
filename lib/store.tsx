'use client'

import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, ReactNode } from 'react'
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
} from '@/types'
import { applyDueIncome } from '@/lib/income'
import { computeNetWorth } from '@/lib/networth'
import { today, setCurrencySymbol } from '@/lib/utils'

const LEGACY_STORAGE_KEY = 'wm_state_v2'

// Every dispatch changes state, and the whole app blob gets re-saved — a
// short debounce coalesces bursts of edits (e.g. deleting several items in a
// row) into one request instead of one per action.
const SAVE_DEBOUNCE_MS = 1000

function persistData(data: AppState, keepalive = false) {
  return fetch('/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive,
  })
}

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

type Action =
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'ADD_ASSET'; payload: Asset }
  | { type: 'DELETE_ASSET'; payload: string }
  | { type: 'ADD_INVESTMENT'; payload: Investment }
  | { type: 'UPDATE_INVESTMENT'; payload: Investment }
  | { type: 'DELETE_INVESTMENT'; payload: string }
  | { type: 'ADD_MUTUAL_FUND'; payload: MutualFund }
  | { type: 'UPDATE_MUTUAL_FUND'; payload: MutualFund }
  | { type: 'DELETE_MUTUAL_FUND'; payload: string }
  | { type: 'SET_BUDGET'; payload: { category: ExpenseCategory; amount: number } }
  | { type: 'ADD_RECURRING_INCOME'; payload: RecurringIncome }
  | { type: 'DELETE_RECURRING_INCOME'; payload: string }
  | { type: 'ADD_INCOME'; payload: Income }
  | { type: 'DELETE_INCOME'; payload: string }
  | { type: 'ADD_BANK_ACCOUNT'; payload: BankAccount }
  | { type: 'DELETE_BANK_ACCOUNT'; payload: string }
  | {
      type: 'PAY_CREDIT_CARD'
      payload: { cardKind: 'asset' | 'bankAccount'; cardId: string; amount: number; fromAccountId: string | null }
    }
  | { type: 'SET_PREFERENCES'; payload: Partial<Preferences> }
  | { type: 'LOAD'; payload: AppState }

// Keeps a running daily history of net worth so it can be charted over time,
// updating today's entry in place rather than appending on every action.
function upsertNetWorthSnapshot(state: AppState): AppState {
  const value = computeNetWorth(state).netWorth
  const t = today()
  const history = state.netWorthHistory
  const last = history[history.length - 1]
  if (last && last.date === t) {
    return last.value === value
      ? state
      : { ...state, netWorthHistory: [...history.slice(0, -1), { date: t, value }] }
  }
  return { ...state, netWorthHistory: [...history, { date: t, value }] }
}

function reducer(state: AppState, action: Action): AppState {
  return upsertNetWorthSnapshot(baseReducer(state, action))
}

function baseReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD':
      return action.payload
    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.payload, ...state.expenses] }
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) }
    case 'ADD_ASSET':
      return { ...state, assets: [action.payload, ...state.assets] }
    case 'DELETE_ASSET':
      return { ...state, assets: state.assets.filter(a => a.id !== action.payload) }
    case 'ADD_INVESTMENT':
      return { ...state, investments: [action.payload, ...state.investments] }
    case 'UPDATE_INVESTMENT':
      return {
        ...state,
        investments: state.investments.map(i =>
          i.id === action.payload.id ? action.payload : i
        ),
      }
    case 'DELETE_INVESTMENT':
      return { ...state, investments: state.investments.filter(i => i.id !== action.payload) }
    case 'ADD_MUTUAL_FUND':
      return { ...state, mutualFunds: [action.payload, ...state.mutualFunds] }
    case 'UPDATE_MUTUAL_FUND':
      return {
        ...state,
        mutualFunds: state.mutualFunds.map(f =>
          f.id === action.payload.id ? action.payload : f
        ),
      }
    case 'DELETE_MUTUAL_FUND':
      return { ...state, mutualFunds: state.mutualFunds.filter(f => f.id !== action.payload) }
    case 'SET_BUDGET':
      return {
        ...state,
        budgets: { ...state.budgets, [action.payload.category]: action.payload.amount },
      }
    case 'ADD_RECURRING_INCOME': {
      const { incomes, recurring, bankAccounts } = applyDueIncome(
        [...state.recurringIncomes, action.payload],
        state.incomes,
        state.bankAccounts
      )
      return { ...state, recurringIncomes: recurring, incomes, bankAccounts }
    }
    case 'DELETE_RECURRING_INCOME':
      return {
        ...state,
        recurringIncomes: state.recurringIncomes.filter(r => r.id !== action.payload),
      }
    case 'ADD_INCOME':
      return { ...state, incomes: [action.payload, ...state.incomes] }
    case 'DELETE_INCOME':
      return { ...state, incomes: state.incomes.filter(i => i.id !== action.payload) }
    case 'ADD_BANK_ACCOUNT':
      return { ...state, bankAccounts: [...state.bankAccounts, action.payload] }
    case 'DELETE_BANK_ACCOUNT':
      return { ...state, bankAccounts: state.bankAccounts.filter(b => b.id !== action.payload) }
    case 'PAY_CREDIT_CARD': {
      const { cardKind, cardId, amount, fromAccountId } = action.payload
      let next = state
      if (cardKind === 'asset') {
        // Asset-based cards have no "overpaid = credit" convention in their
        // UI (always shown as a positive liability), so payments floor at 0
        // rather than going negative.
        next = {
          ...next,
          assets: next.assets.map(a => a.id === cardId ? { ...a, value: Math.max(0, a.value - amount) } : a),
        }
      } else {
        // BankAccount-type cards already use "negative balance = credit" as
        // their documented convention (see Settings), so this can go negative.
        next = {
          ...next,
          bankAccounts: next.bankAccounts.map(b => b.id === cardId ? { ...b, startingBalance: b.startingBalance - amount } : b),
        }
      }
      if (fromAccountId) {
        next = {
          ...next,
          bankAccounts: next.bankAccounts.map(b => b.id === fromAccountId ? { ...b, startingBalance: b.startingBalance - amount } : b),
        }
      }
      return next
    }
    case 'SET_PREFERENCES':
      return { ...state, preferences: { ...state.preferences, ...action.payload } }
    default:
      return state
  }
}

interface StoreCtx {
  state: AppState
  dispatch: React.Dispatch<Action>
  syncError: boolean
}

const StoreContext = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const userId = session?.user?.id

  const [state, dispatch] = useReducer(reducer, initialState)
  const [hydrated, setHydrated] = useState(false)
  const [syncError, setSyncError] = useState(false)

  // The initial cloud fetch below is async, so a fast interaction (or a slow
  // network) can land a dispatch before it resolves. Recording those actions
  // here lets the load() below replay them on top of the cloud snapshot
  // instead of the LOAD silently discarding them.
  const hydratedRef = useRef(false)
  const pendingActionsRef = useRef<Action[]>([])

  const guardedDispatch = useCallback((action: Action) => {
    if (!hydratedRef.current && action.type !== 'LOAD') {
      pendingActionsRef.current.push(action)
    }
    dispatch(action)
  }, [])

  // Keep fmt()/fmtCompact()'s currency symbol in sync with the saved
  // preference. Set synchronously during render (not in a useEffect) so
  // descendants — which render after this in the same pass — pick up the
  // new symbol immediately. An effect would run one commit too late: it
  // fires after children have already rendered with the stale symbol, and
  // mutating a plain variable doesn't trigger the second render needed to
  // pick up the fix.
  setCurrencySymbol(CURRENCIES.find(c => c.code === state.preferences.currency)?.symbol ?? 'Rs')

  // Load this user's data from the cloud after auth resolves. Falls back to
  // migrating any pre-existing browser-local data on the very first load.
  useEffect(() => {
    if (status !== 'authenticated' || !userId) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/data')
        if (!res.ok) throw new Error(`Failed to load data (${res.status})`)
        const { data } = (await res.json()) as { data: AppState | null }

        if (data) {
          const merged = { ...initialState, ...data }
          const { incomes, recurring, bankAccounts } = applyDueIncome(merged.recurringIncomes, merged.incomes, merged.bankAccounts)
          let finalState: AppState = { ...merged, incomes, recurringIncomes: recurring, bankAccounts }
          for (const action of pendingActionsRef.current) {
            finalState = reducer(finalState, action)
          }
          if (!cancelled) {
            dispatch({ type: 'LOAD', payload: finalState })
          }
        } else {
          try {
            const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
            if (raw) {
              const legacy = { ...initialState, ...(JSON.parse(raw) as AppState) }
              const { incomes, recurring, bankAccounts } = applyDueIncome(legacy.recurringIncomes, legacy.incomes, legacy.bankAccounts)
              let finalState: AppState = { ...legacy, incomes, recurringIncomes: recurring, bankAccounts }
              for (const action of pendingActionsRef.current) {
                finalState = reducer(finalState, action)
              }
              if (!cancelled) {
                dispatch({ type: 'LOAD', payload: finalState })
              }
            }
          } catch {}
        }
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch (err) {
        console.error('Failed to load cloud data:', err)
        if (!cancelled) setSyncError(true)
      } finally {
        if (!cancelled) {
          hydratedRef.current = true
          pendingActionsRef.current = []
          setHydrated(true)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [status, userId])

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSaveRef = useRef<AppState | null>(null)

  // Persist to the cloud whenever state changes post-hydration (covers both
  // normal edits and the one-time migration load above). Debounced so a burst
  // of quick edits coalesces into a single request.
  useEffect(() => {
    if (!hydrated || status !== 'authenticated' || !userId) return

    pendingSaveRef.current = state
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(() => {
      const toSave = pendingSaveRef.current
      pendingSaveRef.current = null
      if (!toSave) return
      // keepalive so a navigation landing in the gap between the debounce
      // firing and the response arriving can't get the request aborted —
      // the explicit beforeunload/visibilitychange flush below only covers
      // saves that are still pending, not ones already in flight.
      persistData(toSave, true)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to save data (${res.status})`)
          setSyncError(false)
        })
        .catch(err => {
          console.error('Failed to save data:', err)
          setSyncError(true)
        })
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [state, hydrated, status, userId])

  // A debounced save can still be pending when the tab closes or backgrounds —
  // flush it immediately with `keepalive` so the request survives unload
  // instead of silently dropping the last edit.
  useEffect(() => {
    function flush() {
      if (!pendingSaveRef.current) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      persistData(pendingSaveRef.current, true).catch(() => {})
      pendingSaveRef.current = null
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <StoreContext.Provider value={{ state, dispatch: guardedDispatch, syncError }}>
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
