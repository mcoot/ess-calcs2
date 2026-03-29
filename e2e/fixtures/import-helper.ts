import { type Page, expect } from '@playwright/test'
import { awardCsv, vestingCsv, releasesCsv, salesCsv } from './fake-csv-data'

const CSV_FILES = [
  { name: 'Award Summary.csv', content: awardCsv(10) },
  { name: 'Full Vesting Schedule.csv', content: vestingCsv(5, 27) },
  { name: 'RSU Releases.csv', content: releasesCsv(60) },
  { name: 'Sales - Long Shares.csv', content: salesCsv(60) },
]

export async function importAllSampleData(page: Page) {
  await page.goto('/import')

  for (const file of CSV_FILES) {
    const input = page.locator('input[type="file"]')
    await input.setInputFiles({
      name: file.name,
      mimeType: 'text/csv',
      buffer: Buffer.from(file.content),
    })
    await expect(page.getByText('Import successful')).toBeVisible()
  }
}
