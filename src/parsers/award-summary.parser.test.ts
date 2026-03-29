import { describe, it, expect } from 'vitest'
import { parseAwardSummary } from './award-summary.parser'

const HEADERS = [
  'Award Summary',
  'As Of Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Conversion Price,,Granted,Previously Distributed,,,Not Available For Distribution,,',
  ',,,,,,,,,Shares,Benefit Received,,Shares,Estimated Benefit,',
].join('\n')

function makeCsv(...dataRows: string[]): string {
  return [HEADERS, ...dataRows].join('\n')
}

const ROW_9375 =
  '15-Mar-2026,15-Feb-2018,9375,Share Units (RSU),02.15.2018 RSU Grant (New Hire),New Hire,$52.6476,USD,475,475,"$91,148.86",USD,0,$0.00,USD'
const ROW_83105 =
  '15-Mar-2026,20-Sep-2024,83105,Share Units (RSU),20 SEP 2024 RSU Grant (APEX),Ongoing,$152.6986,USD,"1,520",570,"$113,878.40",USD,950,"$71,449.50",USD'
const TOTAL_ROW = ',,,,,,,,"5,824","3,262","$639,684.23",USD,"2,562","$192,688.02",USD'

describe('parseAwardSummary', () => {
  it('parses golden values for grant 9375', () => {
    const result = parseAwardSummary(makeCsv(ROW_9375))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(1)
    const award = result.data[0]
    expect(award.grantNumber).toBe(9375)
    expect(award.grantDate).toEqual(new Date(Date.UTC(2018, 1, 15)))
    expect(award.grantType).toBe('Share Units (RSU)')
    expect(award.grantName).toBe('02.15.2018 RSU Grant (New Hire)')
    expect(award.grantReason).toBe('New Hire')
    expect(award.conversionPrice).toBe(52.6476)
    expect(award.sharesGranted).toBe(475)
  })

  it('skips headers and total row, returns only data rows', () => {
    const result = parseAwardSummary(makeCsv(ROW_9375, ROW_83105, TOTAL_ROW))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(2)
  })

  it('parses quoted shares with commas', () => {
    const result = parseAwardSummary(makeCsv(ROW_83105))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data[0].sharesGranted).toBe(1520)
  })

  it('returns error on malformed date', () => {
    const badRow =
      'bad-date,bad-date,9375,Share Units (RSU),Grant,New Hire,$52.6476,USD,475,475,"$91,148.86",USD,0,$0.00,USD'
    const result = parseAwardSummary(makeCsv(badRow))
    expect(result.ok).toBe(false)
  })
})
