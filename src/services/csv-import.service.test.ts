import { describe, it, expect } from 'vitest'
import { detectCsvType, importCsv } from './csv-import.service'
import { FakeStore } from '@/store/fake/fake.store'

// ── Minimal valid CSV fixtures (reused from parser tests) ───────────

const AWARD_CSV = [
  'Award Summary',
  'As Of Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Conversion Price,,Granted,Previously Distributed,,,Not Available For Distribution,,',
  ',,,,,,,,,Shares,Benefit Received,,Shares,Estimated Benefit,',
  '15-Mar-2026,15-Feb-2018,9375,Share Units (RSU),02.15.2018 RSU Grant (New Hire),New Hire,$52.6476,USD,475,475,"$91,148.86",USD,0,$0.00,USD',
].join('\n')

const VESTING_CSV = [
  'Full Vesting Schedule',
  'As Of Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Vest Date,Shares',
  '15-Mar-2026,15-Feb-2018,9375,Share Units (RSU),02.15.2018 RSU Grant (New Hire),New Hire,18-Feb-2019,118',
].join('\n')

const RELEASES_CSV = [
  'RSU Releases',
  'Period Start Date,Period End Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Release Date,Shares Vested,Shares Sold-To-Cover,Shares Held,Value,,Fair Market Value Per Share,,Sale Date (Sell-To-Cover only),Sale Price Per Share,,Sale Proceeds,,Sell-To-Cover Amount,,Release Reference Number',
  '01-Jan-2020,15-Mar-2026,15-Feb-2018,9375,Share Units (RSU),02.15.2018 RSU Grant (New Hire),New Hire,18-Feb-2020,30,0,30,"$4,616.40",USD,$153.88,USD,,,,,,$0.00,USD,RB6538C8B1',
].join('\n')

const SALES_CSV = [
  'Sales - Long Shares',
  'Period Start Date,Period End Date,Withdrawal Reference Number,Originating Release Reference Number,Employee Grant Number,Grant Name,Lot Number,Sale Type,Sale Date,Original Acquisition Date,Sold Within 30 Days of Vest,Original Cost Basis Per Share,,Original Cost Basis,,Shares Sold,Sale Proceeds,,Sale Price Per Share,,Brokerage Commission,,Supplemental Transaction Fee,',
  '01-Jan-2020,15-Mar-2026,WRC6476B1C8-1EE,RB54549F21,9375,02.15.2018 RSU Grant (New Hire),1,Long Shares,29-Jan-2020,18-Feb-2019,NO,$104.90,USD,"$3,147.00",USD,30,"$4,478.10",USD,$149.2700,USD,$39.33,USD,$0.39,USD',
].join('\n')

// ── detectCsvType ───────────────────────────────────────────────────

describe('detectCsvType', () => {
  it('returns "awards" for Award Summary', () => {
    expect(detectCsvType('Award Summary')).toBe('awards')
  })

  it('returns "vestingSchedule" for Full Vesting Schedule', () => {
    expect(detectCsvType('Full Vesting Schedule')).toBe('vestingSchedule')
  })

  it('returns "releases" for RSU Releases', () => {
    expect(detectCsvType('RSU Releases')).toBe('releases')
  })

  it('returns "saleLots" for Sales - Long Shares', () => {
    expect(detectCsvType('Sales - Long Shares')).toBe('saleLots')
  })

  it('returns null for unrecognized first line', () => {
    expect(detectCsvType('Something Else')).toBeNull()
  })
})

// ── importCsv ───────────────────────────────────────────────────────

describe('importCsv', () => {
  it('imports a valid Award Summary CSV', async () => {
    const store = new FakeStore()
    const result = await importCsv(store, AWARD_CSV)
    expect(result).toEqual({ ok: true, type: 'awards', count: 1 })
    const awards = await store.getAwards()
    expect(awards).toHaveLength(1)
    expect(awards[0].grantNumber).toBe(9375)
  })

  it('imports a valid Full Vesting Schedule CSV', async () => {
    const store = new FakeStore()
    const result = await importCsv(store, VESTING_CSV)
    expect(result).toEqual({ ok: true, type: 'vestingSchedule', count: 1 })
    const entries = await store.getVestingSchedule()
    expect(entries).toHaveLength(1)
    expect(entries[0].grantNumber).toBe(9375)
  })

  it('imports a valid RSU Releases CSV', async () => {
    const store = new FakeStore()
    const result = await importCsv(store, RELEASES_CSV)
    expect(result).toEqual({ ok: true, type: 'releases', count: 1 })
    const releases = await store.getRsuReleases()
    expect(releases).toHaveLength(1)
    expect(releases[0].releaseReferenceNumber).toBe('RB6538C8B1')
  })

  it('imports a valid Sales - Long Shares CSV', async () => {
    const store = new FakeStore()
    const result = await importCsv(store, SALES_CSV)
    expect(result).toEqual({ ok: true, type: 'saleLots', count: 1 })
    const lots = await store.getSaleLots()
    expect(lots).toHaveLength(1)
    expect(lots[0].withdrawalReferenceNumber).toBe('WRC6476B1C8-1EE')
  })

  it('returns error for unrecognized CSV type', async () => {
    const store = new FakeStore()
    const result = await importCsv(store, 'Unknown Header\ncol1,col2\nval1,val2')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('nrecognized')
    }
    // Store should be unchanged
    expect(await store.getAwards()).toHaveLength(0)
  })

  it('returns error when parser fails on malformed data', async () => {
    const malformedAwardCsv = [
      'Award Summary',
      'As Of Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Conversion Price,,Granted,Previously Distributed,,,Not Available For Distribution,,',
      ',,,,,,,,,Shares,Benefit Received,,Shares,Estimated Benefit,',
      'bad-date,bad-date,9375,Share Units (RSU),Grant,New Hire,$52.6476,USD,475,475,"$91,148.86",USD,0,$0.00,USD',
    ].join('\n')
    const store = new FakeStore()
    const result = await importCsv(store, malformedAwardCsv)
    expect(result.ok).toBe(false)
    // Store should be unchanged
    expect(await store.getAwards()).toHaveLength(0)
  })
})
