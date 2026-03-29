import type { SaleLot } from '@/types'
import { SaleLotSchema } from '@/types'
import type { ParseResult } from './csv-utils'
import {
  splitCsvRow,
  splitCsvLines,
  parseMoney,
  parseShares,
  parseBoolean,
  wrapParse,
} from './csv-utils'
import { parseDDMonYYYY } from '@/lib/dates'

export function parseSales(csv: string): ParseResult<SaleLot> {
  return wrapParse(() => {
    const lines = splitCsvLines(csv, 2)
    const lots: SaleLot[] = []

    for (const line of lines) {
      const cols = splitCsvRow(line)
      const withdrawalRef = cols[2]?.trim()
      if (!withdrawalRef) {
        continue
      }

      lots.push(
        SaleLotSchema.parse({
          withdrawalReferenceNumber: withdrawalRef,
          originatingReleaseRef: cols[3].trim(),
          grantNumber: parseInt(cols[4].trim(), 10),
          grantName: cols[5].trim(),
          lotNumber: parseInt(cols[6].trim(), 10),
          saleType: cols[7].trim(),
          saleDate: parseDDMonYYYY(cols[8].trim()),
          originalAcquisitionDate: parseDDMonYYYY(cols[9].trim()),
          soldWithin30Days: parseBoolean(cols[10].trim()),
          costBasisPerShare: parseMoney(cols[11]),
          costBasis: parseMoney(cols[13]),
          sharesSold: parseShares(cols[15]),
          saleProceeds: parseMoney(cols[16]),
          salePricePerShare: parseMoney(cols[18]),
          brokerageCommission: parseMoney(cols[20]),
          supplementalTransactionFee: parseMoney(cols[22]),
        }),
      )
    }

    return lots
  })
}
