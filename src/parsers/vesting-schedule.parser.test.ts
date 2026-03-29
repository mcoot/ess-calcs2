import { describe, it, expect } from 'vitest'
import { parseVestingSchedule } from './vesting-schedule.parser'

const HEADERS = [
  'Full Vesting Schedule',
  'As Of Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Vest Date,Shares',
].join('\n')

function makeCsv(...lines: string[]): string {
  return [HEADERS, ...lines].join('\n')
}

describe('parseVestingSchedule', () => {
  it('parses golden values for grant 9375 first entry', () => {
    const result = parseVestingSchedule(
      makeCsv(
        'Grant Number: 9375',
        '15-Mar-2026,15-Feb-2018,9375,Share Units (RSU),02.15.2018 RSU Grant (New Hire),New Hire,18-Feb-2019,118',
      ),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(1)
    expect(result.data[0].grantNumber).toBe(9375)
    expect(result.data[0].vestDate).toEqual(new Date(Date.UTC(2019, 1, 18)))
    expect(result.data[0].shares).toBe(118)
  })

  it('skips section breaks, per-grant totals, and grand total', () => {
    const result = parseVestingSchedule(
      makeCsv(
        'Grant Number: 9375',
        '15-Mar-2026,15-Feb-2018,9375,Share Units (RSU),02.15.2018 RSU Grant (New Hire),New Hire,18-Feb-2019,118',
        '15-Mar-2026,15-Feb-2018,9375,Share Units (RSU),02.15.2018 RSU Grant (New Hire),New Hire,18-May-2019,30',
        ',,,,,,,475',
        'Grant Number: 14333',
        ',,,,,,,',
        ',,,,,,,"5,824"',
      ),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(2)
  })

  it('returns error on malformed vest date', () => {
    const result = parseVestingSchedule(
      makeCsv(
        'Grant Number: 9375',
        '15-Mar-2026,15-Feb-2018,9375,Share Units (RSU),Grant,New Hire,bad-date,118',
      ),
    )
    expect(result.ok).toBe(false)
  })
})
