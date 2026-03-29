import type { VestingScheduleEntry } from '@/types'
import { VestingScheduleEntrySchema } from '@/types'
import type { ParseResult } from './csv-utils'
import { splitCsvRow, splitCsvLines, parseShares, wrapParse } from './csv-utils'
import { parseDDMonYYYY } from '@/lib/dates'

const SECTION_BREAK = /^Grant Number:/

export function parseVestingSchedule(csv: string): ParseResult<VestingScheduleEntry> {
  return wrapParse(() => {
    const lines = splitCsvLines(csv, 2)
    const entries: VestingScheduleEntry[] = []

    for (const line of lines) {
      if (SECTION_BREAK.test(line)) continue

      const cols = splitCsvRow(line)
      const grantNumberRaw = cols[2]?.trim()
      if (!grantNumberRaw) continue

      entries.push(
        VestingScheduleEntrySchema.parse({
          grantNumber: parseInt(grantNumberRaw, 10),
          vestDate: parseDDMonYYYY(cols[6].trim()),
          shares: parseShares(cols[7]),
        }),
      )
    }

    return entries
  })
}
