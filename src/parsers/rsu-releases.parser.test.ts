import { describe, it, expect } from 'vitest'
import { parseRsuReleases } from './rsu-releases.parser'

const HEADERS = [
  'RSU Releases',
  'Period Start Date,Period End Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Release Date,Shares Vested,Shares Sold-To-Cover,Shares Held,Value,,Fair Market Value Per Share,,Sale Date (Sell-To-Cover only),Sale Price Per Share,,Sale Proceeds,,Sell-To-Cover Amount,,Release Reference Number',
].join('\n')

function makeCsv(...dataRows: string[]): string {
  return [HEADERS, ...dataRows].join('\n')
}

const ROW_1 =
  '01-Jan-2020,15-Mar-2026,15-Feb-2018,9375,Share Units (RSU),02.15.2018 RSU Grant (New Hire),New Hire,18-Feb-2020,30,0,30,"$4,616.40",USD,$153.88,USD,,,,,,$0.00,USD,RB6538C8B1'
const ROW_2 =
  '01-Jan-2020,15-Mar-2026,15-Jan-2019,14333,Share Units (RSU),15 JAN 2019 RSU Grant,Refresh,18-Feb-2020,67,0,67,"$10,309.96",USD,$153.88,USD,,,,,,$0.00,USD,RB65388044'
const TOTAL_ROW = ',,,,,,,,"3,055",0,"3,055","$615,560.17",USD,,,,,,,,$0.00,USD,'

describe('parseRsuReleases', () => {
  it('parses golden values for first release', () => {
    const result = parseRsuReleases(makeCsv(ROW_1))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(1)
    const r = result.data[0]
    expect(r.grantNumber).toBe(9375)
    expect(r.grantDate).toEqual(new Date(Date.UTC(2018, 1, 15)))
    expect(r.grantName).toBe('02.15.2018 RSU Grant (New Hire)')
    expect(r.grantReason).toBe('New Hire')
    expect(r.releaseDate).toEqual(new Date(Date.UTC(2020, 1, 18)))
    expect(r.sharesVested).toBe(30)
    expect(r.sharesSoldToCover).toBe(0)
    expect(r.sharesHeld).toBe(30)
    expect(r.valueUsd).toBe(4616.4)
    expect(r.fmvPerShare).toBe(153.88)
    expect(r.saleDateSellToCover).toBeUndefined()
    expect(r.salePricePerShare).toBeUndefined()
    expect(r.saleProceeds).toBeUndefined()
    expect(r.sellToCoverAmount).toBe(0)
    expect(r.releaseReferenceNumber).toBe('RB6538C8B1')
  })

  it('skips header and total rows', () => {
    const result = parseRsuReleases(makeCsv(ROW_1, ROW_2, TOTAL_ROW))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(2)
  })

  it('returns error on malformed release date', () => {
    const badRow =
      '01-Jan-2020,15-Mar-2026,15-Feb-2018,9375,Share Units (RSU),Grant,New Hire,bad-date,30,0,30,"$4,616.40",USD,$153.88,USD,,,,,,$0.00,USD,RB6538C8B1'
    const result = parseRsuReleases(makeCsv(badRow))
    expect(result.ok).toBe(false)
  })
})
