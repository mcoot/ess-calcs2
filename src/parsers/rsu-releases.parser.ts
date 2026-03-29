import type { RsuRelease } from '@/types'
import { RsuReleaseSchema } from '@/types'
import type { ParseResult } from './csv-utils'
import { splitCsvRow, splitCsvLines, parseMoney, parseShares, wrapParse } from './csv-utils'
import { parseDDMonYYYY } from '@/lib/dates'

export function parseRsuReleases(csv: string): ParseResult<RsuRelease> {
  return wrapParse(() => {
    const lines = splitCsvLines(csv, 2)
    const releases: RsuRelease[] = []

    for (const line of lines) {
      const cols = splitCsvRow(line)
      const grantNumberRaw = cols[3]?.trim()
      if (!grantNumberRaw) {
        continue
      }

      const saleDateRaw = cols[15]?.trim()
      const salePriceRaw = cols[16]?.trim()
      const saleProceedsRaw = cols[18]?.trim()

      releases.push(
        RsuReleaseSchema.parse({
          grantDate: parseDDMonYYYY(cols[2].trim()),
          grantNumber: parseInt(grantNumberRaw, 10),
          grantName: cols[5].trim(),
          grantReason: cols[6].trim(),
          releaseDate: parseDDMonYYYY(cols[7].trim()),
          sharesVested: parseShares(cols[8]),
          sharesSoldToCover: parseShares(cols[9]),
          sharesHeld: parseShares(cols[10]),
          valueUsd: parseMoney(cols[11]),
          fmvPerShare: parseMoney(cols[13]),
          saleDateSellToCover: saleDateRaw ? parseDDMonYYYY(saleDateRaw) : undefined,
          salePricePerShare: salePriceRaw ? parseMoney(salePriceRaw) : undefined,
          saleProceeds: saleProceedsRaw ? parseMoney(saleProceedsRaw) : undefined,
          sellToCoverAmount: parseMoney(cols[20]),
          releaseReferenceNumber: cols[22].trim(),
        }),
      )
    }

    return releases
  })
}
