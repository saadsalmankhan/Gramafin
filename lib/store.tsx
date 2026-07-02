'use client'

import React, { createContext, useContext, useEffect, useReducer, useState, ReactNode } from 'react'
import {
  AppState,
  Expense,
  Asset,
  Investment,
  MutualFund,
  ExpenseCategory,
  DEFAULT_BUDGETS,
} from '@/types'

const STORAGE_KEY = 'wm_state_v2'

const initialState: AppState = {
  expenses: [],
  assets: [],
  investments: [],
  mutualFunds: [],
  budgets: DEFAULT_BUDGETS,
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
  | { type: 'LOAD'; payload: AppState }

function reducer(state: AppState, action: Action): AppState {
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
    default:
      return state
  }
}

interface StoreCtx {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const StoreContext = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  // Hydration flag lives in state (not a ref) so a React StrictMode dev
  // double-invoke of these effects can't fool the persist effect below —
  // a ref mutation would be visible to the replayed call immediately,
  // while this is only visible after a real re-render commits.
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage after mount (client-only, keeps SSR/hydration output identical).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AppState
        dispatch({ type: 'LOAD', payload: { ...initialState, ...parsed } })
      }
    } catch {}
    setHydrated(true)
  }, [])

  // Don't persist until hydration has committed, so we never clobber real
  // data in localStorage with the empty initialState before the load above
  // has had a chance to apply.
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {}
  }, [state, hydrated])

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
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
