'use client'

import { createContext, useContext, useState, useMemo } from 'react'
import type { DataStore } from '@/store/data-store'
import type { ForexService } from '@/services/forex.service'
import type { EssIncomeService } from '@/services/ess-income.service'
import type { CgtService } from '@/services/cgt.service'
import { createEssIncomeService } from '@/services/ess-income.service'
import { createCgtService } from '@/services/cgt.service'

export interface AppContextValue {
  store: DataStore
  forex: ForexService
  essIncome: EssIncomeService
  cgt: CgtService
  displayCurrency: 'USD' | 'AUD'
  setDisplayCurrency: (currency: 'USD' | 'AUD') => void
  /** Increment to trigger data re-fetch in consuming components */
  refreshKey: number
  refreshData: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return ctx
}

interface AppProviderProps {
  children: React.ReactNode
  store: DataStore
  forex: ForexService
}

export function AppProvider({ children, store, forex }: AppProviderProps) {
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'AUD'>('AUD')
  const [refreshKey, setRefreshKey] = useState(0)

  const essIncome = useMemo(() => createEssIncomeService(forex), [forex])
  const cgt = useMemo(() => createCgtService(forex), [forex])

  const value: AppContextValue = useMemo(
    () => ({
      store,
      forex,
      essIncome,
      cgt,
      displayCurrency,
      setDisplayCurrency,
      refreshKey,
      refreshData: () => setRefreshKey((k) => k + 1),
    }),
    [store, forex, essIncome, cgt, displayCurrency, refreshKey],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
