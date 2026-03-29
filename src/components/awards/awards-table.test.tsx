import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AwardsTable } from './awards-table'
import { AppProvider } from '@/components/providers/app-provider'
import { FakeStore } from '@/store/fake/fake.store'
import { stubForex } from '@/test-helpers'
import { usd } from '@/types'
import type { Award } from '@/types'

const award1: Award = {
  grantDate: new Date(Date.UTC(2018, 1, 15)),
  grantNumber: 9375,
  grantType: 'Share Units (RSU)',
  grantName: '02.15.2018 RSU Grant (New Hire)',
  grantReason: 'New Hire',
  conversionPrice: usd(52.65),
  sharesGranted: 475,
}

const award2: Award = {
  grantDate: new Date(Date.UTC(2024, 8, 20)),
  grantNumber: 83105,
  grantType: 'Share Units (RSU)',
  grantName: '20 SEP 2024 RSU Grant (APEX)',
  grantReason: 'Ongoing',
  conversionPrice: usd(152.7),
  sharesGranted: 1520,
}

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <AppProvider store={new FakeStore()} forex={stubForex}>
      {ui}
    </AppProvider>,
  )
}

describe('AwardsTable', () => {
  it('shows empty state when no awards', () => {
    renderWithProvider(<AwardsTable awards={[]} />)
    expect(screen.getByText(/no awards/i)).toBeDefined()
  })

  it('renders a row per award with correct values', () => {
    renderWithProvider(<AwardsTable awards={[award1, award2]} />)
    // Check both grant numbers appear
    expect(screen.getByText('9375')).toBeDefined()
    expect(screen.getByText('83105')).toBeDefined()
    // Check grant names
    expect(screen.getByText('02.15.2018 RSU Grant (New Hire)')).toBeDefined()
    expect(screen.getByText('20 SEP 2024 RSU Grant (APEX)')).toBeDefined()
    // Check shares
    expect(screen.getByText('475')).toBeDefined()
    expect(screen.getByText('1,520')).toBeDefined()
    // Two data rows
    const rows = screen.getAllByRole('row')
    // 1 header row + 2 data rows
    expect(rows).toHaveLength(3)
  })

  it('formats currency values with US$ prefix', () => {
    renderWithProvider(<AwardsTable awards={[award1]} />)
    expect(screen.getByText('US$52.65')).toBeDefined()
  })
})
