import { describe, it, expect } from 'vitest'
import { parseAwardSummary } from './award-summary.parser'
import { parseVestingSchedule } from './vesting-schedule.parser'
import { parseRsuReleases } from './rsu-releases.parser'
import { parseSales } from './sales.parser'
import { awardCsv, vestingCsv, releasesCsv, salesCsv } from '../../e2e/fixtures/fake-csv-data'

// ── Tests ───────────────────────────────────────────────────────────

describe('CSV import integration (generated data)', () => {
  it('Award Summary: parses multiple awards', () => {
    const result = parseAwardSummary(awardCsv(10))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.data).toHaveLength(10)
    const first = result.data[0]
    expect(first.grantNumber).toBe(1000)
    expect(first.grantName).toBe('Grant 1000')
    expect(first.conversionPrice).toBe(50)
    expect(first.sharesGranted).toBe(100)
  })

  it('Full Vesting Schedule: parses entries across grants', () => {
    const result = parseVestingSchedule(vestingCsv(5, 27))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.data).toHaveLength(135)
    const first = result.data[0]
    expect(first.grantNumber).toBe(1000)
    expect(first.shares).toBe(10)
  })

  it('RSU Releases: parses many release rows', () => {
    const result = parseRsuReleases(releasesCsv(95))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.data.length).toBeGreaterThan(90)
    const first = result.data[0]
    expect(first.grantNumber).toBe(1000)
    expect(first.fmvPerShare).toBe(150)
    expect(first.releaseReferenceNumber).toBe('RBA0000000')
  })

  it('Sales - Long Shares: parses many sale lots', () => {
    const result = parseSales(salesCsv(105))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.data.length).toBeGreaterThan(100)
    const first = result.data[0]
    expect(first.withdrawalReferenceNumber).toBe('WRCC0000000-1EE')
    expect(first.grantNumber).toBe(1000)
    expect(first.soldWithin30Days).toBe(true)
    expect(first.costBasisPerShare).toBe(100)
  })
})
