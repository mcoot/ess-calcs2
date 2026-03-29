import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DataSummary } from './data-summary'
import { AppProvider } from '@/components/providers/app-provider'
import { FakeStore } from '@/store/fake/fake.store'
import { stubForex } from '@/test-helpers'
import { usd } from '@/types'
import type { Award } from '@/types'

function renderWithProvider(ui: React.ReactElement, store = new FakeStore()) {
  return render(
    <AppProvider store={store} forex={stubForex}>
      {ui}
    </AppProvider>,
  )
}

const testAward: Award = {
  grantDate: new Date(Date.UTC(2018, 1, 15)),
  grantNumber: 9375,
  grantType: 'Share Units (RSU)',
  grantName: 'Test Grant',
  grantReason: 'New Hire',
  conversionPrice: usd(52.65),
  sharesGranted: 475,
}

describe('DataSummary', () => {
  it('shows empty state when store has no data', async () => {
    renderWithProvider(<DataSummary />)
    await waitFor(() => {
      expect(screen.getByText(/no data/i)).toBeDefined()
    })
  })

  it('shows counts when store has data', async () => {
    const store = new FakeStore()
    await store.saveAwards([testAward, { ...testAward, grantNumber: 14333 }])
    renderWithProvider(<DataSummary />, store)
    await waitFor(() => {
      expect(screen.getByText(/awards/i)).toBeDefined()
      expect(screen.getByText(/2/)).toBeDefined()
    })
  })
})
