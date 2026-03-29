import { type Page, expect } from '@playwright/test'
import path from 'node:path'

const SAMPLE_DIR = path.resolve(__dirname, '../../data/sample')

const CSV_FILES = [
  'Award Summary.csv',
  'Full Vesting Schedule.csv',
  'RSU Releases.csv',
  'Sales - Long Shares.csv',
]

export async function importAllSampleData(page: Page) {
  await page.goto('/import')

  for (const file of CSV_FILES) {
    const input = page.locator('input[type="file"]')
    await input.setInputFiles(path.join(SAMPLE_DIR, file))
    await expect(page.getByText('Import successful')).toBeVisible()
  }
}
