import { parseDDMonYYYY } from '@/lib/dates'

const DATA_ROW = /^\d{2}-[A-Z][a-z]{2}-\d{4}/

/**
 * Pure transformation logic for cleaning raw RBA forex CSV files.
 * Extracts only date + AUD/USD rate from multi-column RBA CSVs.
 */
export function cleanRbaCsv(rawCsvTexts: string[]): string {
  const rowsByDate = new Map<string, string>()

  for (const text of rawCsvTexts) {
    const lines = text.replace(/^\uFEFF/, '').split('\n')
    for (const line of lines) {
      if (!DATA_ROW.test(line.trim())) continue

      const cols = line.split(',')
      const date = cols[0].trim()
      const rate = cols[1]?.trim()

      if (!rate || rate === '') {
        throw new Error(`Missing rate for data row: "${line}"`)
      }

      rowsByDate.set(date, `${date},${rate}`)
    }
  }

  const sorted = [...rowsByDate.entries()].sort(
    ([a], [b]) => parseDDMonYYYY(a).getTime() - parseDDMonYYYY(b).getTime(),
  )

  return sorted.map(([, row]) => row).join('\n') + '\n'
}
