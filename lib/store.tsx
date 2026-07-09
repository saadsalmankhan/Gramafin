'use client'

import React, { createContext, useContext, useEffect, useReducer, useRef, useState, ReactNode } from 'react'
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
} from '@/types'
import { applyDueIncome } from '@/lib/income'
import { computeNetWorth } from '@/lib/networth'
import { today } from '@/lib/utils'

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
}

type Action =
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'ADD_ASSET'; payload: Asset }
  | { type: 'DELETE_ASSET'; payload: string }
  | { type: 'ADD_INVESTMENT'; payload: Investment }
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
      const { incomes, recurring } = applyDueIncome(
        [...state.recurringIncomes, action.payload],
        state.incomes
      )
      return { ...state, recurringIncomes: recurring, incomes }
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
          const { incomes, recurring } = applyDueIncome(merged.recurringIncomes, merged.incomes)
          if (!cancelled) {
            dispatch({ type: 'LOAD', payload: { ...merged, incomes, recurringIncomes: recurring } })
          }
        } else {
          try {
            const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
            if (raw) {
              const legacy = { ...initialState, ...(JSON.parse(raw) as AppState) }
              const { incomes, recurring } = applyDueIncome(legacy.recurringIncomes, legacy.incomes)
              if (!cancelled) {
                dispatch({ type: 'LOAD', payload: { ...legacy, incomes, recurringIncomes: recurring } })
              }
            }
          } catch {}
        }
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch (err) {
        console.error('Failed to load cloud data:', err)
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
      persistData(toSave)
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
    <StoreContext.Provider value={{ state, dispatch, syncError }}>
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
