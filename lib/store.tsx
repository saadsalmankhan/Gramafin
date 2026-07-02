'use client'

import React, { createContext, useContext, useEffect, useReducer, useState, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import {
  AppState,
  Expense,
  Asset,
  Investment,
  MutualFund,
  ExpenseCategory,
  DEFAULT_BUDGETS,
} from '@/types'

const LEGACY_STORAGE_KEY = 'wm_state_v2'

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
          if (!cancelled) dispatch({ type: 'LOAD', payload: { ...initialState, ...data } })
        } else {
          try {
            const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
            if (raw) {
              const legacy = JSON.parse(raw) as AppState
              if (!cancelled) dispatch({ type: 'LOAD', payload: { ...initialState, ...legacy } })
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

  // Persist to the cloud whenever state changes post-hydration (covers both
  // normal edits and the one-time migration load above).
  useEffect(() => {
    if (!hydrated || status !== 'authenticated' || !userId) return

    fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to save data (${res.status})`)
        setSyncError(false)
      })
      .catch(err => {
        console.error('Failed to save data:', err)
        setSyncError(true)
      })
  }, [state, hydrated, status, userId])

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
