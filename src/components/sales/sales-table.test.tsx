import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SalesTable } from './sales-table'
import type { SaleLot } from '@/types'
import type { SaleLotCgt } from '@/services/cgt.service'
import { usd, aud } from '@/types'
import { d } from '@/test-helpers'

// ── Fixtures ────────────────────────────────────────────────────────

const normalLot: SaleLot = {
  withdrawalReferenceNumber: 'WRC6476B1C8-1EE',
  originatingReleaseRef: 'RB54549F21',
  grantNumber: 9375,
  grantName: '02.15.2018 RSU Grant (New Hire)',
  lotNumber: 1,
  saleType: 'Long Shares',
  saleDate: d(2021, 8, 3),
  originalAcquisitionDate: d(2020, 2, 18),
  soldWithin30Days: false,
  costBasisPerShare: usd(104.9),
  costBasis: usd(3147.0),
  sharesSold: 30,
  saleProceeds: usd(9780.0),
  salePricePerShare: usd(326.0),
  brokerageCommission: usd(2.33),
  supplementalTransactionFee: usd(0.05),
}

const normalCgt: SaleLotCgt = {
  withdrawalRef: 'WRC6476B1C8-1EE',
  originatingReleaseRef: 'RB54549F21',
  grantNumber: 9375,
  lotNumber: 1,
  saleDate: d(2021, 8, 3),
  acquisitionDate: d(2020, 2, 18),
  costBasisUsd: usd(3147.0),
  grossProceedsUsd: usd(9780.0),
  brokerageUsd: usd(2.33),
  feesUsd: usd(0.05),
  netProceedsUsd: usd(9777.62),
  sharesSold: 30,
  acquisitionForexRate: 0.67,
  acquisitionForexDate: d(2020, 2, 18),
  saleForexRate: 0.74,
  saleForexDate: d(2021, 8, 3),
  costBasisAud: aud(4697.01),
  netProceedsAud: aud(13213.0),
  capitalGainLossAud: aud(8515.99),
  capitalGainLossUsd: usd(6630.62),
  holdingDays: 531,
  isLongTerm: true,
  isDiscountEligible: true,
  financialYear: '2021-22',
}

const thirtyDayLot: SaleLot = {
  ...normalLot,
  withdrawalReferenceNumber: 'WRC-30DAY',
  lotNumber: 2,
  saleDate: d(2020, 3, 5),
  originalAcquisitionDate: d(2020, 2, 18),
  soldWithin30Days: true,
}

// ── Tests ───────────────────────────────────────────────────────────

describe('SalesTable', () => {
  it('shows empty state when no sale lots', () => {
    render(<SalesTable lots={[]} cgtResults={[]} displayCurrency="AUD" />)
    expect(screen.getByText(/no sales/i)).toBeDefined()
  })

  it('renders a non-30-day lot with CGT gain/loss', () => {
    render(<SalesTable lots={[normalLot]} cgtResults={[normalCgt]} displayCurrency="AUD" />)
    expect(screen.getByText('9375')).toBeDefined()
    expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('A$8,515.99')).toBeDefined()
    expect(screen.getAllByText('2021-22').length).toBeGreaterThanOrEqual(1)
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(3) // header + 1 group header + 1 data
  })

  it('shows USD gain/loss when displayCurrency is USD', () => {
    render(<SalesTable lots={[normalLot]} cgtResults={[normalCgt]} displayCurrency="USD" />)
    expect(screen.getByText('US$6,630.62')).toBeDefined()
    expect(screen.getByText('Gain/Loss (USD)')).toBeDefined()
  })

  it('renders a 30-day lot with badge and no CGT', () => {
    render(<SalesTable lots={[thirtyDayLot]} cgtResults={[]} displayCurrency="AUD" />)
    // Badge is rendered inside the data row, not the header
    const badges = screen.getAllByText('30-Day')
    expect(badges).toHaveLength(2) // header column + badge
    // No CGT result for this lot, so gain/loss shows dash
    expect(screen.getByText('—')).toBeDefined()
  })

  it('clicking expand shows CGT detail with forex rates', async () => {
    const user = userEvent.setup()
    render(<SalesTable lots={[normalLot]} cgtResults={[normalCgt]} displayCurrency="AUD" />)
    await user.click(screen.getAllByRole('row')[2]) // click data row to expand (0=header, 1=group header, 2=data)
    // Should show both forex rates in the detail
    expect(screen.getByText(/0\.67/)).toBeDefined()
    expect(screen.getByText(/0\.74/)).toBeDefined()
  })

  it('groups lots by withdrawal with header rows', () => {
    const lot1: SaleLot = {
      ...normalLot,
      withdrawalReferenceNumber: 'WRC-AAA',
      originatingReleaseRef: 'REL-1',
      sharesSold: 10,
      saleProceeds: usd(1000),
    }
    const lot2: SaleLot = {
      ...normalLot,
      withdrawalReferenceNumber: 'WRC-BBB',
      originatingReleaseRef: 'REL-2',
      saleDate: d(2021, 9, 1),
      sharesSold: 20,
      saleProceeds: usd(2000),
    }

    render(<SalesTable lots={[lot1, lot2]} cgtResults={[]} displayCurrency="AUD" />)

    // Two withdrawal group headers should be present
    expect(screen.getByText(/WRC-AAA/)).toBeDefined()
    expect(screen.getByText(/WRC-BBB/)).toBeDefined()
    // 1 table header + 2 group headers + 2 lot rows = 5 rows
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(5)
  })

  it('group header shows total shares and proceeds for its lots', () => {
    const lot1: SaleLot = {
      ...normalLot,
      withdrawalReferenceNumber: 'WRC-GRP',
      originatingReleaseRef: 'REL-1',
      sharesSold: 10,
      saleProceeds: usd(1500),
      costBasis: usd(1000),
    }
    const lot2: SaleLot = {
      ...normalLot,
      withdrawalReferenceNumber: 'WRC-GRP',
      originatingReleaseRef: 'REL-2',
      sharesSold: 25,
      saleProceeds: usd(3500),
      costBasis: usd(2000),
    }

    render(<SalesTable lots={[lot1, lot2]} cgtResults={[]} displayCurrency="AUD" />)

    // Group header should show summed shares (35) and proceeds ($5,000.00)
    expect(screen.getByText('35')).toBeDefined()
    expect(screen.getByText('US$5,000.00')).toBeDefined()
  })

  it('30-day lot row expands to show ESS income info', async () => {
    const user = userEvent.setup()
    const lot30: SaleLot = {
      ...normalLot,
      withdrawalReferenceNumber: 'WRC-30EXPAND',
      originatingReleaseRef: 'RB-VEST-123',
      soldWithin30Days: true,
      saleDate: d(2023, 2, 24),
      originalAcquisitionDate: d(2023, 2, 13),
    }

    render(<SalesTable lots={[lot30]} cgtResults={[]} displayCurrency="AUD" />)

    // Should have an expandable row despite no CGT data
    await user.click(screen.getAllByRole('row')[2]) // click data row to expand (0=header, 1=group header, 2=data)

    // Should show ESS income messaging and release ref
    expect(screen.getByText(/ESS income/i)).toBeDefined()
    expect(screen.getByText(/RB-VEST-123/)).toBeDefined()
  })

  it('resolves key collision: same withdrawalRef+lotNumber, different originatingReleaseRef', () => {
    const lotA: SaleLot = {
      ...normalLot,
      withdrawalReferenceNumber: 'WRC-SAME',
      originatingReleaseRef: 'REL-A',
      lotNumber: 1,
      soldWithin30Days: false,
    }
    const lotB: SaleLot = {
      ...normalLot,
      withdrawalReferenceNumber: 'WRC-SAME',
      originatingReleaseRef: 'REL-B',
      lotNumber: 1,
      soldWithin30Days: true,
    }
    const cgtA: SaleLotCgt = {
      ...normalCgt,
      withdrawalRef: 'WRC-SAME',
      originatingReleaseRef: 'REL-A',
      lotNumber: 1,
      capitalGainLossAud: aud(5000),
    }

    render(<SalesTable lots={[lotA, lotB]} cgtResults={[cgtA]} displayCurrency="AUD" />)

    // Non-30-day lot shows its CGT value
    expect(screen.getByText('A$5,000.00')).toBeDefined()
    // 30-day lot shows dash (no CGT data)
    expect(screen.getByText('—')).toBeDefined()
  })
})
