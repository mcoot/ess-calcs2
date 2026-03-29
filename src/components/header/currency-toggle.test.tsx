import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CurrencyToggle } from './currency-toggle'
import { AppProvider } from '@/components/providers/app-provider'
import { FakeStore } from '@/store/fake/fake.store'
import { stubForex } from '@/test-helpers'

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <AppProvider store={new FakeStore()} forex={stubForex}>
      {ui}
    </AppProvider>,
  )
}

describe('CurrencyToggle', () => {
  it('renders with AUD active by default', () => {
    renderWithProvider(<CurrencyToggle />)
    expect(screen.getByRole('button', { name: 'AUD' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'USD' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking USD switches currency to USD', async () => {
    const user = userEvent.setup()
    renderWithProvider(<CurrencyToggle />)
    await user.click(screen.getByRole('button', { name: 'USD' }))
    expect(screen.getByRole('button', { name: 'USD' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'AUD' })).toHaveAttribute('aria-pressed', 'false')
  })
})
