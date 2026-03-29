import { describe, it, expect } from 'vitest'
import { parseSales } from './sales.parser'

const HEADERS = [
  'Sales - Long Shares',
  'Period Start Date,Period End Date,Withdrawal Reference Number,Originating Release Reference Number,Employee Grant Number,Grant Name,Lot Number,Sale Type,Sale Date,Original Acquisition Date,Sold Within 30 Days of Vest,Original Cost Basis Per Share,,Original Cost Basis,,Shares Sold,Sale Proceeds,,Sale Price Per Share,,Brokerage Commission,,Supplemental Transaction Fee,',
].join('\n')

function makeCsv(...dataRows: string[]): string {
  return [HEADERS, ...dataRows].join('\n')
}

const ROW_1 =
  '01-Jan-2020,15-Mar-2026,WRC6476B1C8-1EE,RB54549F21,9375,02.15.2018 RSU Grant (New Hire),1,Long Shares,29-Jan-2020,18-Feb-2019,NO,$104.90,USD,"$3,147.00",USD,30,"$4,478.10",USD,$149.2700,USD,$39.33,USD,$0.39,USD'
const ROW_2 =
  '01-Jan-2020,15-Mar-2026,WRC692F7C95-1EE,RB54549F21,9375,02.15.2018 RSU Grant (New Hire),1,Long Shares,05-May-2020,18-Feb-2019,NO,$104.90,USD,"$9,231.20",USD,88,"$14,445.20",USD,$164.1500,USD,$11.48,USD,$0.42,USD'
const TOTAL_ROW = ',,,,,,,,,,,,,,,,,,,,,,,,'

describe('parseSales', () => {
  it('parses golden values for first sale lot', () => {
    const result = parseSales(makeCsv(ROW_1))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(1)
    const lot = result.data[0]
    expect(lot.withdrawalReferenceNumber).toBe('WRC6476B1C8-1EE')
    expect(lot.originatingReleaseRef).toBe('RB54549F21')
    expect(lot.grantNumber).toBe(9375)
    expect(lot.grantName).toBe('02.15.2018 RSU Grant (New Hire)')
    expect(lot.lotNumber).toBe(1)
    expect(lot.saleType).toBe('Long Shares')
    expect(lot.saleDate).toEqual(new Date(Date.UTC(2020, 0, 29)))
    expect(lot.originalAcquisitionDate).toEqual(new Date(Date.UTC(2019, 1, 18)))
    expect(lot.soldWithin30Days).toBe(false)
    expect(lot.costBasisPerShare).toBe(104.9)
    expect(lot.costBasis).toBe(3147.0)
    expect(lot.sharesSold).toBe(30)
    expect(lot.saleProceeds).toBe(4478.1)
    expect(lot.salePricePerShare).toBe(149.27)
    expect(lot.brokerageCommission).toBe(39.33)
    expect(lot.supplementalTransactionFee).toBe(0.39)
  })

  it('skips header and total rows', () => {
    const result = parseSales(makeCsv(ROW_1, ROW_2, TOTAL_ROW))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(2)
  })

  it('returns error on malformed sale date', () => {
    const badRow =
      '01-Jan-2020,15-Mar-2026,WRC6476B1C8-1EE,RB54549F21,9375,Grant,1,Long Shares,bad-date,18-Feb-2019,NO,$104.90,USD,"$3,147.00",USD,30,"$4,478.10",USD,$149.27,USD,$39.33,USD,$0.39,USD'
    const result = parseSales(makeCsv(badRow))
    expect(result.ok).toBe(false)
  })
})
