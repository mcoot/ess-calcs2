'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAppContext } from '@/components/providers/app-provider'
import { createDashboardService } from '@/services/dashboard.service'
import { useFyFilter } from '@/hooks/use-fy-filter'
import {
  toVestValueBars,
  toSharePriceLine,
  toEssIncomeByFyBars,
  toCgtByFyBars,
  toCumulativeEssIncome,
} from '@/lib/chart-data'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { FySelector } from '@/components/dashboard/fy-selector'
import { EmptyState } from '@/components/dashboard/empty-state'
import { VestValueChart } from '@/components/dashboard/charts/vest-value-chart'
import { SharePriceChart } from '@/components/dashboard/charts/share-price-chart'
import { EssIncomeFyChart } from '@/components/dashboard/charts/ess-income-fy-chart'
import { CgtFyChart } from '@/components/dashboard/charts/cgt-fy-chart'
import { CumulativeEssChart } from '@/components/dashboard/charts/cumulative-ess-chart'
import type { Award, SaleLot } from '@/types'
import type { ReleaseEssIncome, FyEssIncome } from '@/services/ess-income.service'
import type { FyCgtSummary } from '@/services/cgt.service'

export default function DashboardPage() {
  const { store, essIncome, cgt, displayCurrency, refreshKey } = useAppContext()
  const dashboard = useMemo(() => createDashboardService(), [])

  const [awards, setAwards] = useState<Award[]>([])
  const [releaseIncomes, setReleaseIncomes] = useState<ReleaseEssIncome[]>([])
  const [fyEssIncomes, setFyEssIncomes] = useState<FyEssIncome[]>([])
  const [fyCgtSummaries, setFyCgtSummaries] = useState<FyCgtSummary[]>([])
  const [saleLots, setSaleLots] = useState<SaleLot[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      const [aw, rels, lots] = await Promise.all([
        store.getAwards(),
        store.getRsuReleases(),
        store.getSaleLots(),
      ])
      setAwards(aw)
      setSaleLots(lots)

      const incomes = essIncome.calculateByRelease(rels, lots)
      setReleaseIncomes(incomes)
      setFyEssIncomes(essIncome.aggregateByFy(incomes))

      const cgtResults = cgt.calculateByLot(lots)
      setFyCgtSummaries(cgt.aggregateByFy(cgtResults))

      setLoaded(true)
    }
    load()
  }, [store, essIncome, cgt, refreshKey])

  const availableFinancialYears = useMemo(() => {
    const fySet = new Set<string>()
    for (const r of releaseIncomes) {
      fySet.add(r.financialYear)
    }
    for (const c of fyCgtSummaries) {
      fySet.add(c.financialYear)
    }
    return [...fySet].sort()
  }, [releaseIncomes, fyCgtSummaries])

  const { selectedFy, setSelectedFy, filterByFy } = useFyFilter()

  const summary = useMemo(
    () => dashboard.summarize(awards, releaseIncomes, fyCgtSummaries, saleLots, selectedFy),
    [dashboard, awards, releaseIncomes, fyCgtSummaries, saleLots, selectedFy],
  )

  const filteredReleases = useMemo(() => filterByFy(releaseIncomes), [filterByFy, releaseIncomes])
  const filteredFyEss = useMemo(() => filterByFy(fyEssIncomes), [filterByFy, fyEssIncomes])
  const filteredFyCgt = useMemo(() => filterByFy(fyCgtSummaries), [filterByFy, fyCgtSummaries])

  const hasData = awards.length > 0 || releaseIncomes.length > 0 || saleLots.length > 0

  if (loaded && !hasData) {
    return (
      <main className="space-y-6 p-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <EmptyState type="no-data" />
      </main>
    )
  }

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <FySelector
        availableFys={availableFinancialYears}
        selectedFy={selectedFy}
        onSelect={setSelectedFy}
      />

      <SummaryCards summary={summary} displayCurrency={displayCurrency} />

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-2 text-lg font-semibold">Vest Value Over Time</h2>
          <VestValueChart
            data={toVestValueBars(filteredReleases, displayCurrency)}
            currency={displayCurrency}
          />
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Share Price at Vest</h2>
          <SharePriceChart data={toSharePriceLine(filteredReleases)} />
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">ESS Income by Financial Year</h2>
          <EssIncomeFyChart
            data={toEssIncomeByFyBars(filteredFyEss, displayCurrency)}
            currency={displayCurrency}
          />
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Capital Gains/Losses by Financial Year</h2>
          <CgtFyChart
            data={toCgtByFyBars(filteredFyCgt, displayCurrency)}
            currency={displayCurrency}
          />
        </section>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Cumulative ESS Income</h2>
        <CumulativeEssChart
          data={toCumulativeEssIncome(filteredReleases, displayCurrency)}
          currency={displayCurrency}
        />
      </section>
    </main>
  )
}
