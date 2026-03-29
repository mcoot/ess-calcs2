import type { Award } from '@/types'
import { AwardSchema } from '@/types'
import type { ParseResult } from './csv-utils'
import { splitCsvRow, splitCsvLines, parseMoney, parseShares, wrapParse } from './csv-utils'
import { parseDDMonYYYY } from '@/lib/dates'

export function parseAwardSummary(csv: string): ParseResult<Award> {
  return wrapParse(() => {
    const lines = splitCsvLines(csv, 3)
    const awards: Award[] = []

    for (const line of lines) {
      const cols = splitCsvRow(line)
      const grantNumberRaw = cols[2]?.trim()
      if (!grantNumberRaw) {
        continue
      }

      awards.push(
        AwardSchema.parse({
          grantDate: parseDDMonYYYY(cols[1].trim()),
          grantNumber: parseInt(grantNumberRaw, 10),
          grantType: cols[3].trim(),
          grantName: cols[4].trim(),
          grantReason: cols[5].trim(),
          conversionPrice: parseMoney(cols[6]),
          sharesGranted: parseShares(cols[8]),
        }),
      )
    }

    return awards
  })
}
