import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataSummary } from './data-summary'
import { AppProvider } from '@/components/providers/app-provider'
import { FakeStore } from '@/store/fake/fake.store'
import { stubForex } from '@/test-helpers'
import { usd } from '@/types'
import type { Award, ForexRate } from '@/types'

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

  it('does not show clear button when no data is loaded', async () => {
    renderWithProvider(<DataSummary />)
    await waitFor(() => {
      expect(screen.getByText(/no data/i)).toBeDefined()
    })
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull()
  })

  it('shows clear button when data is loaded', async () => {
    const store = new FakeStore()
    await store.saveAwards([testAward])
    renderWithProvider(<DataSummary />, store)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear data/i })).toBeDefined()
    })
  })

  it('first click changes button to confirmation state', async () => {
    const user = userEvent.setup()
    const store = new FakeStore()
    await store.saveAwards([testAward])
    renderWithProvider(<DataSummary />, store)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear data/i })).toBeDefined()
    })
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    expect(screen.getByRole('button', { name: /confirm clear/i })).toBeDefined()
  })

  it('second click clears all CSV data and shows empty state', async () => {
    const user = userEvent.setup()
    const store = new FakeStore()
    await store.saveAwards([testAward])
    renderWithProvider(<DataSummary />, store)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear data/i })).toBeDefined()
    })
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    await user.click(screen.getByRole('button', { name: /confirm clear/i }))
    await waitFor(() => {
      expect(screen.getByText(/no data/i)).toBeDefined()
    })
    expect(await store.getAwards()).toEqual([])
  })

  it('does not clear forex rates', async () => {
    const user = userEvent.setup()
    const store = new FakeStore()
    const testRate: ForexRate = { date: new Date(Date.UTC(2024, 0, 1)), audToUsd: 0.65 }
    await store.saveAwards([testAward])
    await store.saveForexRates([testRate])
    renderWithProvider(<DataSummary />, store)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear data/i })).toBeDefined()
    })
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    await user.click(screen.getByRole('button', { name: /confirm clear/i }))
    await waitFor(() => {
      expect(screen.getByText(/no data/i)).toBeDefined()
    })
    expect(await store.getForexRates()).toEqual([testRate])
  })

  it('confirmation auto-resets after timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const store = new FakeStore()
    await store.saveAwards([testAward])
    renderWithProvider(<DataSummary />, store)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear data/i })).toBeDefined()
    })
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    expect(screen.getByRole('button', { name: /confirm clear/i })).toBeDefined()
    await vi.advanceTimersByTimeAsync(3000)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear data/i })).toBeDefined()
    })
    vi.useRealTimers()
  })
})
