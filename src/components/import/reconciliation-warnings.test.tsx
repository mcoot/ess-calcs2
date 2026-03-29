import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReconciliationWarnings } from './reconciliation-warnings'
import type { ReconciliationWarning } from '@/services/reconciliation.service'

describe('ReconciliationWarnings', () => {
  it('renders nothing when there are no warnings', () => {
    const { container } = render(<ReconciliationWarnings warnings={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders error warnings with destructive variant', () => {
    const warnings: ReconciliationWarning[] = [
      {
        severity: 'error',
        category: 'orphan-ref',
        message: 'Sale lot references unknown release RB-GHOST',
      },
    ]

    render(<ReconciliationWarnings warnings={warnings} />)

    expect(screen.getByText(/RB-GHOST/)).toBeDefined()
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('destructive')
  })

  it('renders warning-severity items with default variant', () => {
    const warnings: ReconciliationWarning[] = [
      {
        severity: 'warning',
        category: 'share-count',
        message: 'Grant 9375: 70 shares vested vs 100 granted',
      },
    ]

    render(<ReconciliationWarnings warnings={warnings} />)

    expect(screen.getByText(/Grant 9375/)).toBeDefined()
    const alert = screen.getByRole('alert')
    expect(alert.className).not.toContain('destructive')
  })
})
