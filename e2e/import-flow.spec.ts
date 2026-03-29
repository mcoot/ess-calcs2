import { test, expect } from '@playwright/test'
import { importAllSampleData } from './fixtures/import-helper'

test.describe('Import flow', () => {
  test('uploads all 4 CSVs and shows success', async ({ page }) => {
    await importAllSampleData(page)
    await expect(page.getByText('Import successful')).toBeVisible()
  })

  test('data summary shows loaded row counts', async ({ page }) => {
    await importAllSampleData(page)

    await expect(page.getByText('Loaded data')).toBeVisible()
    await expect(page.getByText(/Awards: \d+ rows/)).toBeVisible()
    await expect(page.getByText(/Releases: \d+ rows/)).toBeVisible()
    await expect(page.getByText(/Sale Lots: \d+ rows/)).toBeVisible()
    await expect(page.getByText(/Vesting Schedule: \d+ rows/)).toBeVisible()
  })

  test('reconciliation warnings display after import', async ({ page }) => {
    await importAllSampleData(page)

    // Sample data has known mismatches — reconciliation should surface them
    const alerts = page.getByRole('alert')
    await expect(alerts.first()).toBeVisible()
  })
})
