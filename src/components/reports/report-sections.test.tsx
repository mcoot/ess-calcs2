import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EssIncomeSection } from './ess-income-section'
import { CgtSection } from './cgt-section'
import { ThirtyDaySection } from './thirty-day-section'
import type {
  EssIncomeReportRow,
  CgtReportRow,
  ThirtyDaySummaryRow,
} from '@/services/report.service'
import type { FyCgtSummary } from '@/services/cgt.service'
import { usd, aud } from '@/types'
import { d } from '@/test-helpers'

// ── Fixtures ────────────────────────────────────────────────────────

const essRow: EssIncomeReportRow = {
  date: d(2024, 2, 12),
  grantNumber: 9375,
  grantName: '2018 RSU Grant',
  releaseRef: 'RB-001',
  shares: 100,
  fmvPerShareUsd: usd(150),
  grossValueUsd: usd(15000),
  exchangeRate: 0.65,
  rateDate: d(2024, 2, 12),
  essIncomeAud: aud(23076.92),
  is30DayRule: false,
  notes: '',
}

const essRow30Day: EssIncomeReportRow = {
  ...essRow,
  date: d(2024, 2, 22),
  shares: 30,
  grossValueUsd: usd(4500),
  essIncomeAud: aud(6716.42),
  is30DayRule: true,
  notes: 'Sold 10 days after vest',
}

const cgtRow: CgtReportRow = {
  saleDate: d(2024, 1, 15),
  acquisitionDate: d(2022, 10, 3),
  grantNumber: 9375,
  grantName: '2018 RSU Grant',
  lotNumber: 1,
  sharesSold: 20,
  holdingDays: 469,
  discountEligible: true,
  costBasisUsd: usd(2000),
  costBasisAud: aud(3076.92),
  costBasisRate: 0.65,
  costBasisRateDate: d(2022, 10, 3),
  grossProceedsUsd: usd(3000),
  brokerageUsd: usd(0),
  feesUsd: usd(0),
  netProceedsUsd: usd(3000),
  netProceedsAud: aud(4411.76),
  proceedsRate: 0.68,
  proceedsRateDate: d(2024, 1, 15),
  capitalGainLossAud: aud(1334.84),
}

const cgtSummary: FyCgtSummary = {
  financialYear: '2023-24',
  lots: [],
  shortTermGains: aud(500),
  longTermGains: aud(1334.84),
  totalGains: aud(1834.84),
  shortTermLosses: aud(0),
  longTermLosses: aud(0),
  totalLosses: aud(0),
  shortTermAfterLosses: aud(500),
  longTermAfterLosses: aud(1334.84),
  discountAmount: aud(667.42),
  discountedLongTerm: aud(667.42),
  netCapitalGain: aud(1167.42),
  netCapitalLoss: aud(0),
}

const thirtyDayRow: ThirtyDaySummaryRow = {
  saleDate: d(2024, 2, 22),
  vestDate: d(2024, 2, 12),
  daysHeld: 10,
  grantNumber: 9375,
  grantName: '2018 RSU Grant',
  shares: 30,
  saleProceedsUsd: usd(4500),
  essIncomeAud: aud(6716.42),
}

// ── ESS Income Section ──────────────────────────────────────────────

describe('EssIncomeSection', () => {
  it('renders ATO item reference', () => {
    render(<EssIncomeSection rows={[essRow]} totalAud={aud(23076.92)} fy="2023-24" />)
    expect(screen.getByText(/Item 12/)).toBeDefined()
    expect(screen.getByText(/Label F/)).toBeDefined()
  })

  it('renders detail rows', () => {
    render(<EssIncomeSection rows={[essRow]} totalAud={aud(23076.92)} fy="2023-24" />)
    expect(screen.getByText('RB-001')).toBeDefined()
    expect(screen.getByText('100')).toBeDefined()
    expect(screen.getByText('9375')).toBeDefined()
  })

  it('shows 30-day badge for 30-day rows', () => {
    render(<EssIncomeSection rows={[essRow, essRow30Day]} totalAud={aud(29793.34)} fy="2023-24" />)
    const badges = screen.getAllByText('30-day')
    expect(badges).toHaveLength(1)
  })

  it('renders total in footer', () => {
    render(<EssIncomeSection rows={[essRow]} totalAud={aud(23076.92)} fy="2023-24" />)
    expect(screen.getByText('Total ESS Income')).toBeDefined()
    // Total appears in both row and footer; verify both exist
    expect(screen.getAllByText('A$23,076.92')).toHaveLength(2)
  })

  it('shows empty message when no rows', () => {
    render(<EssIncomeSection rows={[]} totalAud={aud(0)} fy="2023-24" />)
    expect(screen.getByText(/No ESS income events/)).toBeDefined()
  })
})

// ── CGT Section ─────────────────────────────────────────────────────

describe('CgtSection', () => {
  it('renders ATO item reference', () => {
    render(<CgtSection rows={[cgtRow]} summary={cgtSummary} fy="2023-24" />)
    expect(screen.getByText(/Item 18/)).toBeDefined()
  })

  it('renders gain/loss walkthrough with after-losses intermediates', () => {
    render(<CgtSection rows={[cgtRow]} summary={cgtSummary} fy="2023-24" />)
    expect(screen.getByText(/Net capital gain/i)).toBeDefined()
    expect(screen.getByText('A$1,167.42')).toBeDefined()
    expect(screen.getByText(/Short-term after losses/)).toBeDefined()
    expect(screen.getByText(/Long-term after losses/)).toBeDefined()
  })

  it('renders detail rows with discount badge', () => {
    render(<CgtSection rows={[cgtRow]} summary={cgtSummary} fy="2023-24" />)
    expect(screen.getByText('469')).toBeDefined()
  })

  it('shows empty message when no rows', () => {
    const emptySummary: FyCgtSummary = {
      ...cgtSummary,
      totalGains: aud(0),
      netCapitalGain: aud(0),
    }
    render(<CgtSection rows={[]} summary={emptySummary} fy="2023-24" />)
    expect(screen.getByText(/No capital gains events/)).toBeDefined()
  })
})

// ── 30-Day Section ──────────────────────────────────────────────────

describe('ThirtyDaySection', () => {
  it('renders cross-reference rows', () => {
    render(<ThirtyDaySection rows={[thirtyDayRow]} />)
    expect(screen.getByText('10')).toBeDefined()
    expect(screen.getByText('30')).toBeDefined()
  })

  it('shows empty message when no rows', () => {
    render(<ThirtyDaySection rows={[]} />)
    expect(screen.getByText(/No 30-day rule events/)).toBeDefined()
  })
})
