import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VestValueChart } from './vest-value-chart'
import { SharePriceChart } from './share-price-chart'
import { EssIncomeFyChart } from './ess-income-fy-chart'
import { CgtFyChart } from './cgt-fy-chart'
import { CumulativeEssChart } from './cumulative-ess-chart'

// Recharts ResponsiveContainer needs ResizeObserver
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('VestValueChart', () => {
  it('shows empty state when no data', () => {
    render(<VestValueChart data={[]} currency="AUD" />)
    expect(screen.getByTestId('vest-value-empty')).toBeDefined()
  })

  it('renders chart container with data', () => {
    render(
      <VestValueChart data={[{ date: '2023-01-01', value: 5000, grant: '9375' }]} currency="AUD" />,
    )
    expect(screen.getByTestId('vest-value-chart')).toBeDefined()
  })
})

describe('SharePriceChart', () => {
  it('shows empty state when no data', () => {
    render(<SharePriceChart data={[]} />)
    expect(screen.getByTestId('share-price-empty')).toBeDefined()
  })

  it('renders chart container with data', () => {
    render(<SharePriceChart data={[{ date: '2023-01-01', fmvPerShare: 150, grantNumber: 9375 }]} />)
    expect(screen.getByTestId('share-price-chart')).toBeDefined()
  })
})

describe('EssIncomeFyChart', () => {
  it('shows empty state when no data', () => {
    render(<EssIncomeFyChart data={[]} currency="AUD" />)
    expect(screen.getByTestId('ess-income-fy-empty')).toBeDefined()
  })

  it('renders chart container with data', () => {
    render(
      <EssIncomeFyChart
        data={[{ fy: '2022-23', standard: 5000, thirtyDay: 1000 }]}
        currency="AUD"
      />,
    )
    expect(screen.getByTestId('ess-income-fy-chart')).toBeDefined()
  })
})

describe('CgtFyChart', () => {
  it('shows empty state when no data', () => {
    render(<CgtFyChart data={[]} currency="AUD" />)
    expect(screen.getByTestId('cgt-fy-empty')).toBeDefined()
  })

  it('renders chart container with data', () => {
    render(
      <CgtFyChart
        data={[
          {
            fy: '2022-23',
            shortTermGains: 1000,
            longTermGains: 5000,
            losses: -800,
            netGain: 4700,
          },
        ]}
        currency="AUD"
      />,
    )
    expect(screen.getByTestId('cgt-fy-chart')).toBeDefined()
  })
})

describe('CumulativeEssChart', () => {
  it('shows empty state when no data', () => {
    render(<CumulativeEssChart data={[]} currency="AUD" />)
    expect(screen.getByTestId('cumulative-ess-empty')).toBeDefined()
  })

  it('renders chart container with data', () => {
    render(<CumulativeEssChart data={[{ date: '2023-01-01', cumulative: 5000 }]} currency="AUD" />)
    expect(screen.getByTestId('cumulative-ess-chart')).toBeDefined()
  })
})
