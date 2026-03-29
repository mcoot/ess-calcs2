import { test, expect } from '@playwright/test'
import { importAllSampleData } from './fixtures/import-helper'

test.describe('Currency toggle', () => {
  test.beforeEach(async ({ page }) => {
    await importAllSampleData(page)
    await page.goto('/')
  })

  test('toggle to USD shows dollar amounts without A$ prefix', async ({ page }) => {
    await page.getByRole('button', { name: 'USD' }).click()

    // Summary cards should show $ but not A$
    const cards = page.locator("[class*='card']")
    const text = await cards.allTextContents()
    const joined = text.join(' ')
    expect(joined).toContain('$')
    expect(joined).not.toContain('A$')
  })

  test('toggle back to AUD shows A$ prefix', async ({ page }) => {
    // Switch to USD first, then back to AUD
    await page.getByRole('button', { name: 'USD' }).click()
    await page.getByRole('button', { name: 'AUD' }).click()

    const cards = page.locator("[class*='card']")
    const text = await cards.allTextContents()
    const joined = text.join(' ')
    expect(joined).toContain('A$')
  })
})
