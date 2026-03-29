import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImportResults } from './import-results'

describe('ImportResults', () => {
  it('renders nothing when result is null', () => {
    const { container } = render(<ImportResults result={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows success message when result is ok', () => {
    render(<ImportResults result={{ ok: true, type: 'awards', count: 3 }} />)
    expect(screen.getByText(/awards/i)).toBeDefined()
    expect(screen.getByText(/3/)).toBeDefined()
  })

  it('shows error message when result is not ok', () => {
    render(<ImportResults result={{ ok: false, error: 'Bad CSV' }} />)
    expect(screen.getByText(/Bad CSV/)).toBeDefined()
  })
})
