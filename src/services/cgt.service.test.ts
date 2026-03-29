import { describe, it, expect } from 'vitest'
import { createCgtService } from './cgt.service'
import type { SaleLotCgt } from './cgt.service'
import { createForexService } from './forex.service'
import type { SaleLot, ForexRate } from '@/types'
import { usd, aud } from '@/types'
import { d } from '@/test-helpers'

const MILLIS_PER_DAY = 86_400_000

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MILLIS_PER_DAY)
}

function makeLot(
  overrides: Partial<SaleLot> &
    Pick<
      SaleLot,
      | 'saleDate'
      | 'originalAcquisitionDate'
      | 'soldWithin30Days'
      | 'sharesSold'
      | 'saleProceeds'
      | 'costBasis'
    >,
): SaleLot {
  return {
    withdrawalReferenceNumber: overrides.withdrawalReferenceNumber ?? 'WRC-TEST',
    originatingReleaseRef: overrides.originatingReleaseRef ?? 'REL-TEST',
    grantNumber: overrides.grantNumber ?? 9375,
    grantName: overrides.grantName ?? 'Test Grant',
    lotNumber: overrides.lotNumber ?? 1,
    saleType: overrides.saleType ?? 'Long Shares',
    saleDate: overrides.saleDate,
    originalAcquisitionDate: overrides.originalAcquisitionDate,
    soldWithin30Days: overrides.soldWithin30Days,
    costBasisPerShare: overrides.costBasisPerShare ?? usd(100),
    costBasis: overrides.costBasis,
    sharesSold: overrides.sharesSold,
    saleProceeds: overrides.saleProceeds,
    salePricePerShare: overrides.salePricePerShare ?? usd(150),
    brokerageCommission: overrides.brokerageCommission ?? usd(0),
    supplementalTransactionFee: overrides.supplementalTransactionFee ?? usd(0),
  }
}

// ── Forex rates for CGT tests ───────────────────────────────────────

const CGT_RATES: ForexRate[] = [
  { date: d(2019, 2, 18), audToUsd: 0.72 }, // Case 1 acq
  { date: d(2021, 8, 3), audToUsd: 0.74 }, // Case 1 sale
  { date: d(2021, 8, 18), audToUsd: 0.73 }, // Case 2 acq
  { date: d(2022, 6, 1), audToUsd: 0.75 }, // Cases 13,15 long-term acq
  { date: d(2022, 11, 8), audToUsd: 0.65 }, // Case 2 sale
  { date: d(2023, 1, 2), audToUsd: 0.68 }, // Cases 5,6 acq
  { date: d(2023, 6, 1), audToUsd: 0.8 }, // Case 16 acq
  { date: d(2024, 1, 2), audToUsd: 0.69 }, // Cases 5,13-short acq; case 5 sale
  { date: d(2024, 1, 3), audToUsd: 0.691 }, // Case 6 sale
  { date: d(2024, 3, 1), audToUsd: 0.6 }, // Cases 4,7,8,10,12,14,15 acq
  { date: d(2024, 5, 25), audToUsd: 0.605 }, // Case 13 lot C acq (30-day)
  { date: d(2024, 6, 3), audToUsd: 0.62 }, // Multiple cases: sale date
  { date: d(2024, 9, 2), audToUsd: 0.5 }, // Case 16 sale
  { date: d(2025, 3, 14), audToUsd: 0.63 }, // Case 9 fallback (Fri for Sat acq)
  { date: d(2025, 3, 18), audToUsd: 0.631 }, // Case 9 fallback (gap day sale)
  { date: d(2025, 4, 1), audToUsd: 0.64 }, // Case 14 sale2 (long-term)
]

describe('CgtService — calculateByLot', () => {
  const forex = createForexService(CGT_RATES)
  const service = createCgtService(forex)

  it('Case 1: simple long-term gain (spec Test Case 1)', () => {
    const lot = makeLot({
      withdrawalReferenceNumber: 'WRC81521E07-1EE',
      originatingReleaseRef: 'RB54549F21',
      grantNumber: 9375,
      saleDate: d(2021, 8, 3),
      originalAcquisitionDate: d(2019, 2, 18),
      soldWithin30Days: false,
      sharesSold: 30,
      costBasis: usd(3147.0),
      costBasisPerShare: usd(104.9),
      saleProceeds: usd(4478.1),
      salePricePerShare: usd(149.27),
      brokerageCommission: usd(39.33),
      supplementalTransactionFee: usd(0.39),
    })

    const [result] = service.calculateByLot([lot])

    // Net proceeds USD: 4478.10 - 39.33 - 0.39 = 4438.38
    expect(result.netProceedsUsd).toBeCloseTo(4438.38, 2)
    expect(result.costBasisUsd).toBeCloseTo(3147.0, 2)

    // AUD: cost = 3147 / 0.72 = 4370.833... → 4370.83
    expect(result.costBasisAud).toBeCloseTo(4370.83, 2)
    expect(result.acquisitionForexRate).toBe(0.72)

    // AUD: net proceeds = 4438.38 / 0.74 = 5997.810... → 5997.81
    expect(result.netProceedsAud).toBeCloseTo(5997.81, 2)
    expect(result.saleForexRate).toBe(0.74)

    // Gain = 5997.81 - 4370.83 = 1626.98
    expect(result.capitalGainLossAud).toBeCloseTo(1626.98, 2)
    // USD gain = 4438.38 - 3147.00 = 1291.38
    expect(result.capitalGainLossUsd).toBeCloseTo(1291.38, 2)

    // Holding: ~897 days, long-term, discount eligible (positive gain)
    expect(result.holdingDays).toBe(daysBetween(d(2019, 2, 18), d(2021, 8, 3)))
    expect(result.isLongTerm).toBe(true)
    expect(result.isDiscountEligible).toBe(true)
    expect(result.financialYear).toBe('2021-22')
  })

  it('Case 2: capital loss — no discount on losses', () => {
    const lot = makeLot({
      withdrawalReferenceNumber: 'WRC9F3CF137-1EE',
      originatingReleaseRef: 'RB82856F04',
      saleDate: d(2022, 11, 8),
      originalAcquisitionDate: d(2021, 8, 18),
      soldWithin30Days: false,
      sharesSold: 30,
      costBasis: usd(10131.9),
      costBasisPerShare: usd(337.73),
      saleProceeds: usd(3618.0),
      salePricePerShare: usd(120.6),
      brokerageCommission: usd(0),
      supplementalTransactionFee: usd(0.13),
    })

    const [result] = service.calculateByLot([lot])

    // Net proceeds: 3618.00 - 0.00 - 0.13 = 3617.87
    expect(result.netProceedsUsd).toBeCloseTo(3617.87, 2)

    // Cost AUD: 10131.90 / 0.73 = 13879.315... → 13879.32
    expect(result.costBasisAud).toBeCloseTo(13879.32, 2)

    // Net proc AUD: 3617.87 / 0.65 = 5565.953... → 5565.95
    expect(result.netProceedsAud).toBeCloseTo(5565.95, 2)

    // Loss = 5565.95 - 13879.32 = -8313.37
    expect(result.capitalGainLossAud).toBeCloseTo(-8313.37, 2)
    // USD loss = 3617.87 - 10131.90 = -6514.03
    expect(result.capitalGainLossUsd).toBeCloseTo(-6514.03, 2)

    // Long-term but a loss → not discount eligible
    expect(result.isLongTerm).toBe(true)
    expect(result.isDiscountEligible).toBe(false)
    expect(result.financialYear).toBe('2022-23')
  })

  it('Case 3: 30-day lot excluded from CGT', () => {
    const lot = makeLot({
      saleDate: d(2024, 3, 1),
      originalAcquisitionDate: d(2024, 2, 20),
      soldWithin30Days: true,
      sharesSold: 10,
      costBasis: usd(1000),
      saleProceeds: usd(1100),
    })

    const results = service.calculateByLot([lot])
    expect(results).toHaveLength(0)
  })

  it('Case 4: short-term lot — no discount eligibility', () => {
    const lot = makeLot({
      saleDate: d(2024, 6, 3),
      originalAcquisitionDate: d(2024, 3, 1),
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(1000),
      saleProceeds: usd(1200),
    })

    const [result] = service.calculateByLot([lot])

    const expectedDays = daysBetween(d(2024, 3, 1), d(2024, 6, 3)) // 94 days
    expect(result.holdingDays).toBe(expectedDays)
    expect(result.isLongTerm).toBe(false)
    expect(result.isDiscountEligible).toBe(false)

    // Cost AUD: 1000 / 0.60 = 1666.67
    expect(result.costBasisAud).toBeCloseTo(1666.67, 2)
    // Net proc AUD: 1200 / 0.62 = 1935.48
    expect(result.netProceedsAud).toBeCloseTo(1935.48, 2)
    // Gain: 1935.48 - 1666.67 = 268.81
    expect(result.capitalGainLossAud).toBeCloseTo(268.81, 2)
    // USD gain = 1200 - 1000 = 200
    expect(result.capitalGainLossUsd).toBeCloseTo(200, 2)
  })

  it('Case 5: exactly 365 days — NOT discount eligible', () => {
    // 2023-01-02 to 2024-01-02 = exactly 365 days
    const lot = makeLot({
      saleDate: d(2024, 1, 2),
      originalAcquisitionDate: d(2023, 1, 2),
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(1000),
      saleProceeds: usd(1500),
    })

    const [result] = service.calculateByLot([lot])

    expect(result.holdingDays).toBe(365)
    expect(result.isLongTerm).toBe(false)
    expect(result.isDiscountEligible).toBe(false)
  })

  it('Case 6: 366 days — discount eligible (positive gain)', () => {
    // 2023-01-02 to 2024-01-03 = 366 days
    const lot = makeLot({
      saleDate: d(2024, 1, 3),
      originalAcquisitionDate: d(2023, 1, 2),
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(1000),
      saleProceeds: usd(1500),
    })

    const [result] = service.calculateByLot([lot])

    expect(result.holdingDays).toBe(366)
    expect(result.isLongTerm).toBe(true)
    expect(result.isDiscountEligible).toBe(true)
  })

  it('Case 7: two different forex rates — acquisition date vs sale date', () => {
    const lot = makeLot({
      saleDate: d(2024, 6, 3), // rate 0.6200
      originalAcquisitionDate: d(2024, 3, 1), // rate 0.6000
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(1000),
      saleProceeds: usd(1200),
    })

    const [result] = service.calculateByLot([lot])

    expect(result.acquisitionForexRate).toBe(0.6)
    expect(result.acquisitionForexDate).toEqual(d(2024, 3, 1))
    expect(result.saleForexRate).toBe(0.62)
    expect(result.saleForexDate).toEqual(d(2024, 6, 3))

    // Confirm different rates used for cost vs proceeds
    expect(result.acquisitionForexRate).not.toBe(result.saleForexRate)
  })

  it('Case 8: net proceeds deducts brokerage and fees', () => {
    const lot = makeLot({
      saleDate: d(2024, 6, 3),
      originalAcquisitionDate: d(2024, 3, 1),
      soldWithin30Days: false,
      sharesSold: 30,
      costBasis: usd(3000),
      saleProceeds: usd(5000),
      brokerageCommission: usd(45.5),
      supplementalTransactionFee: usd(2.75),
    })

    const [result] = service.calculateByLot([lot])

    expect(result.grossProceedsUsd).toBeCloseTo(5000, 2)
    expect(result.brokerageUsd).toBeCloseTo(45.5, 2)
    expect(result.feesUsd).toBeCloseTo(2.75, 2)
    // Net = 5000 - 45.50 - 2.75 = 4951.75
    expect(result.netProceedsUsd).toBeCloseTo(4951.75, 2)
  })

  it('Case 9: forex weekend/gap fallback on both acquisition and sale dates', () => {
    // Acq on Saturday 15-Mar-2025 → falls back to Fri 14-Mar (0.6300)
    // Sale on Wed 19-Mar-2025, no rate → falls back to 18-Mar (0.6310)
    const lot = makeLot({
      saleDate: d(2025, 3, 19),
      originalAcquisitionDate: d(2025, 3, 15),
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(1000),
      saleProceeds: usd(1100),
    })

    const [result] = service.calculateByLot([lot])

    expect(result.acquisitionForexRate).toBe(0.63)
    expect(result.acquisitionForexDate).toEqual(d(2025, 3, 14))
    expect(result.saleForexRate).toBe(0.631)
    expect(result.saleForexDate).toEqual(d(2025, 3, 18))
  })

  it('Case 10: multiple lots — returns one result per qualifying lot', () => {
    const qualifying1 = makeLot({
      withdrawalReferenceNumber: 'WRC-Q1',
      saleDate: d(2024, 6, 3),
      originalAcquisitionDate: d(2024, 3, 1),
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(1000),
      saleProceeds: usd(1200),
      lotNumber: 1,
    })
    const qualifying2 = makeLot({
      withdrawalReferenceNumber: 'WRC-Q2',
      saleDate: d(2024, 6, 3),
      originalAcquisitionDate: d(2024, 3, 1),
      soldWithin30Days: false,
      sharesSold: 5,
      costBasis: usd(500),
      saleProceeds: usd(700),
      lotNumber: 2,
    })
    const excluded = makeLot({
      withdrawalReferenceNumber: 'WRC-EX',
      saleDate: d(2024, 6, 3),
      originalAcquisitionDate: d(2024, 5, 25),
      soldWithin30Days: true,
      sharesSold: 8,
      costBasis: usd(800),
      saleProceeds: usd(900),
      lotNumber: 3,
    })

    const results = service.calculateByLot([qualifying1, qualifying2, excluded])

    expect(results).toHaveLength(2)
    expect(results.map((r) => r.withdrawalRef)).toContain('WRC-Q1')
    expect(results.map((r) => r.withdrawalRef)).toContain('WRC-Q2')
  })

  it('Case 11: AUD rounding to 2dp on all monetary fields', () => {
    // Use values that produce non-terminating decimals
    // 3147 / 0.72 = 4370.8333...
    const lot = makeLot({
      saleDate: d(2021, 8, 3),
      originalAcquisitionDate: d(2019, 2, 18),
      soldWithin30Days: false,
      sharesSold: 30,
      costBasis: usd(3147.0),
      saleProceeds: usd(4478.1),
      brokerageCommission: usd(39.33),
      supplementalTransactionFee: usd(0.39),
    })

    const [result] = service.calculateByLot([lot])

    // Verify all AUD fields are exactly 2dp
    expect(result.costBasisAud).toBe(parseFloat(result.costBasisAud.toFixed(2)))
    expect(result.netProceedsAud).toBe(parseFloat(result.netProceedsAud.toFixed(2)))
    expect(result.capitalGainLossAud).toBe(parseFloat(result.capitalGainLossAud.toFixed(2)))
  })

  it('Case 12: audit trail — all source fields populated', () => {
    const lot = makeLot({
      withdrawalReferenceNumber: 'WRC-AUDIT',
      originatingReleaseRef: 'REL-AUDIT',
      grantNumber: 45088,
      lotNumber: 3,
      saleDate: d(2024, 6, 3),
      originalAcquisitionDate: d(2024, 3, 1),
      soldWithin30Days: false,
      sharesSold: 15,
      costBasis: usd(1500),
      saleProceeds: usd(2000),
      brokerageCommission: usd(10),
      supplementalTransactionFee: usd(0.5),
    })

    const [result] = service.calculateByLot([lot])

    expect(result.withdrawalRef).toBe('WRC-AUDIT')
    expect(result.originatingReleaseRef).toBe('REL-AUDIT')
    expect(result.grantNumber).toBe(45088)
    expect(result.lotNumber).toBe(3)
    expect(result.saleDate).toEqual(d(2024, 6, 3))
    expect(result.acquisitionDate).toEqual(d(2024, 3, 1))
    expect(result.sharesSold).toBe(15)
    expect(result.grossProceedsUsd).toBeCloseTo(2000, 2)
    expect(result.brokerageUsd).toBeCloseTo(10, 2)
    expect(result.feesUsd).toBeCloseTo(0.5, 2)
  })

  it('Case 13: same sale date, mixed holding periods — independent per-lot calc', () => {
    // All sold on 2024-06-03 (rate 0.62)
    const longTermLot = makeLot({
      withdrawalReferenceNumber: 'WRC-LT',
      saleDate: d(2024, 6, 3),
      originalAcquisitionDate: d(2022, 6, 1), // rate 0.75, ~2 years
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(1500),
      saleProceeds: usd(2000),
      lotNumber: 1,
    })
    const shortTermLot = makeLot({
      withdrawalReferenceNumber: 'WRC-ST',
      saleDate: d(2024, 6, 3),
      originalAcquisitionDate: d(2024, 1, 2), // rate 0.69, ~5 months
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(800),
      saleProceeds: usd(1000),
      lotNumber: 2,
    })
    const thirtyDayLot = makeLot({
      withdrawalReferenceNumber: 'WRC-30D',
      saleDate: d(2024, 6, 3),
      originalAcquisitionDate: d(2024, 5, 25), // within 30 days
      soldWithin30Days: true,
      sharesSold: 8,
      costBasis: usd(800),
      saleProceeds: usd(900),
      lotNumber: 3,
    })

    const results = service.calculateByLot([longTermLot, shortTermLot, thirtyDayLot])

    // Only 2 results — 30-day lot excluded
    expect(results).toHaveLength(2)

    const lt = results.find((r) => r.withdrawalRef === 'WRC-LT')!
    const st = results.find((r) => r.withdrawalRef === 'WRC-ST')!

    // Long-term lot
    expect(lt.isLongTerm).toBe(true)
    expect(lt.isDiscountEligible).toBe(true)
    // Cost: 1500 / 0.75 = 2000.00
    expect(lt.costBasisAud).toBeCloseTo(2000.0, 2)
    // Proc: 2000 / 0.62 = 3225.81
    expect(lt.netProceedsAud).toBeCloseTo(3225.81, 2)
    // Gain: 3225.81 - 2000 = 1225.81
    expect(lt.capitalGainLossAud).toBeCloseTo(1225.81, 2)

    // Short-term lot
    expect(st.isLongTerm).toBe(false)
    expect(st.isDiscountEligible).toBe(false)
    // Cost: 800 / 0.69 = 1159.42
    expect(st.costBasisAud).toBeCloseTo(1159.42, 2)
    // Proc: 1000 / 0.62 = 1612.90
    expect(st.netProceedsAud).toBeCloseTo(1612.9, 2)
    // Gain: 1612.90 - 1159.42 = 453.48
    expect(st.capitalGainLossAud).toBeCloseTo(453.48, 2)
  })

  it('Case 14: same acquisition date, different sale dates — different holding/forex', () => {
    // Both acquired 2024-03-01 (rate 0.60)
    const earlyLot = makeLot({
      withdrawalReferenceNumber: 'WRC-EARLY',
      saleDate: d(2024, 6, 3), // rate 0.62, ~3 months → short-term
      originalAcquisitionDate: d(2024, 3, 1),
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(1000),
      saleProceeds: usd(1200),
      lotNumber: 1,
    })
    const lateLot = makeLot({
      withdrawalReferenceNumber: 'WRC-LATE',
      saleDate: d(2025, 4, 1), // rate 0.64, ~13 months → long-term
      originalAcquisitionDate: d(2024, 3, 1),
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(1000),
      saleProceeds: usd(1500),
      lotNumber: 2,
    })

    const results = service.calculateByLot([earlyLot, lateLot])

    const early = results.find((r) => r.withdrawalRef === 'WRC-EARLY')!
    const late = results.find((r) => r.withdrawalRef === 'WRC-LATE')!

    // Same acquisition rate
    expect(early.acquisitionForexRate).toBe(0.6)
    expect(late.acquisitionForexRate).toBe(0.6)

    // Different sale rates
    expect(early.saleForexRate).toBe(0.62)
    expect(late.saleForexRate).toBe(0.64)

    // Different holding periods
    expect(early.isLongTerm).toBe(false)
    expect(late.isLongTerm).toBe(true)

    // Different FYs
    expect(early.financialYear).toBe('2023-24')
    expect(late.financialYear).toBe('2024-25')
  })

  it('Case 15: gain on short-term, loss on long-term in same sale', () => {
    const shortGain = makeLot({
      withdrawalReferenceNumber: 'WRC-SG',
      saleDate: d(2024, 6, 3), // rate 0.62
      originalAcquisitionDate: d(2024, 3, 1), // rate 0.60
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(500),
      saleProceeds: usd(700),
      lotNumber: 1,
    })
    const longLoss = makeLot({
      withdrawalReferenceNumber: 'WRC-LL',
      saleDate: d(2024, 6, 3), // rate 0.62
      originalAcquisitionDate: d(2022, 6, 1), // rate 0.75
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(3000),
      saleProceeds: usd(2000),
      lotNumber: 2,
    })

    const results = service.calculateByLot([shortGain, longLoss])

    const sg = results.find((r) => r.withdrawalRef === 'WRC-SG')!
    const ll = results.find((r) => r.withdrawalRef === 'WRC-LL')!

    // Short-term gain: cost 500/0.6=833.33, proc 700/0.62=1129.03, gain=295.70
    expect(sg.isLongTerm).toBe(false)
    expect(sg.capitalGainLossAud).toBeCloseTo(295.7, 2)
    expect(sg.isDiscountEligible).toBe(false)

    // Long-term loss: cost 3000/0.75=4000, proc 2000/0.62=3225.81, loss=-774.19
    expect(ll.isLongTerm).toBe(true)
    expect(ll.capitalGainLossAud).toBeCloseTo(-774.19, 2)
    expect(ll.isDiscountEligible).toBe(false) // loss → no discount
  })

  it('Case 16: currency movement creates AUD gain despite USD loss', () => {
    // AUD depreciated significantly between acquisition and sale
    // acq rate 0.80 (strong AUD), sale rate 0.50 (weak AUD)
    const lot = makeLot({
      saleDate: d(2024, 9, 2), // rate 0.5000
      originalAcquisitionDate: d(2023, 6, 1), // rate 0.8000
      soldWithin30Days: false,
      sharesSold: 10,
      costBasis: usd(1000),
      saleProceeds: usd(900),
    })

    const [result] = service.calculateByLot([lot])

    // USD: loss of $100 (proceeds 900 < cost 1000)
    expect(result.netProceedsUsd - (result.costBasisUsd as number)).toBeCloseTo(-100, 2)

    // AUD: cost = 1000/0.8 = 1250, proceeds = 900/0.5 = 1800
    expect(result.costBasisAud).toBeCloseTo(1250.0, 2)
    expect(result.netProceedsAud).toBeCloseTo(1800.0, 2)

    // AUD gain = 1800 - 1250 = 550 (positive gain despite USD loss!)
    expect(result.capitalGainLossAud).toBeCloseTo(550.0, 2)
    expect(result.isLongTerm).toBe(true)
    expect(result.isDiscountEligible).toBe(true)
  })
})

// ── aggregateByFy tests ─────────────────────────────────────────────

function makeLotCgt(
  overrides: Partial<SaleLotCgt> &
    Pick<SaleLotCgt, 'capitalGainLossAud' | 'isLongTerm' | 'financialYear'>,
): SaleLotCgt {
  const gain = overrides.capitalGainLossAud
  const costBasisUsd = overrides.costBasisUsd ?? usd(1000)
  const netProceedsUsd = overrides.netProceedsUsd ?? usd(1500)
  return {
    withdrawalRef: overrides.withdrawalRef ?? 'WRC-AGG',
    originatingReleaseRef: overrides.originatingReleaseRef ?? 'REL-AGG',
    grantNumber: overrides.grantNumber ?? 9375,
    lotNumber: overrides.lotNumber ?? 1,
    saleDate: overrides.saleDate ?? d(2024, 1, 1),
    acquisitionDate: overrides.acquisitionDate ?? d(2023, 1, 1),
    costBasisUsd,
    grossProceedsUsd: overrides.grossProceedsUsd ?? usd(1500),
    brokerageUsd: overrides.brokerageUsd ?? usd(0),
    feesUsd: overrides.feesUsd ?? usd(0),
    netProceedsUsd,
    sharesSold: overrides.sharesSold ?? 10,
    acquisitionForexRate: overrides.acquisitionForexRate ?? 0.65,
    acquisitionForexDate: overrides.acquisitionForexDate ?? d(2023, 1, 1),
    saleForexRate: overrides.saleForexRate ?? 0.65,
    saleForexDate: overrides.saleForexDate ?? d(2024, 1, 1),
    costBasisAud: overrides.costBasisAud ?? aud(1538.46),
    netProceedsAud: overrides.netProceedsAud ?? aud(2307.69),
    capitalGainLossAud: gain,
    capitalGainLossUsd:
      overrides.capitalGainLossUsd ?? usd((netProceedsUsd as number) - (costBasisUsd as number)),
    holdingDays: overrides.holdingDays ?? 400,
    isLongTerm: overrides.isLongTerm,
    isDiscountEligible:
      overrides.isDiscountEligible ?? (overrides.isLongTerm && (gain as number) > 0),
    financialYear: overrides.financialYear,
  }
}

describe('CgtService — aggregateByFy', () => {
  const forex = createForexService(CGT_RATES)
  const service = createCgtService(forex)

  it('Case 1: all long-term gains, no losses — 50% discount applied', () => {
    const lots = [
      makeLotCgt({
        capitalGainLossAud: aud(1000),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 1,
      }),
      makeLotCgt({
        capitalGainLossAud: aud(2000),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 2,
      }),
    ]

    const [result] = service.aggregateByFy(lots)

    expect(result.longTermGains).toBeCloseTo(3000, 2)
    expect(result.shortTermGains).toBeCloseTo(0, 2)
    expect(result.totalLosses).toBeCloseTo(0, 2)
    expect(result.longTermAfterLosses).toBeCloseTo(3000, 2)
    expect(result.discountAmount).toBeCloseTo(1500, 2)
    expect(result.discountedLongTerm).toBeCloseTo(1500, 2)
    expect(result.netCapitalGain).toBeCloseTo(1500, 2)
    expect(result.netCapitalLoss).toBeCloseTo(0, 2)
    // USD: raw sums, no discount — 500 + 500 = 1000
    expect(result.longTermGainsUsd).toBeCloseTo(1000, 2)
    expect(result.shortTermGainsUsd).toBeCloseTo(0, 2)
    expect(result.totalGainsUsd).toBeCloseTo(1000, 2)
    expect(result.totalLossesUsd).toBeCloseTo(0, 2)
    expect(result.totalGainLossUsd).toBeCloseTo(1000, 2)
  })

  it('Case 2: all short-term gains, no losses — no discount', () => {
    const lots = [
      makeLotCgt({
        capitalGainLossAud: aud(600),
        isLongTerm: false,
        financialYear: '2023-24',
        lotNumber: 1,
      }),
      makeLotCgt({
        capitalGainLossAud: aud(400),
        isLongTerm: false,
        financialYear: '2023-24',
        lotNumber: 2,
      }),
    ]

    const [result] = service.aggregateByFy(lots)

    expect(result.shortTermGains).toBeCloseTo(1000, 2)
    expect(result.longTermGains).toBeCloseTo(0, 2)
    expect(result.shortTermAfterLosses).toBeCloseTo(1000, 2)
    expect(result.discountAmount).toBeCloseTo(0, 2)
    expect(result.netCapitalGain).toBeCloseTo(1000, 2)
  })

  it('Case 3: losses offset short-term gains first (ATO ordering)', () => {
    // Short-term gains: 1000, Long-term gains: 2000, Losses: 800
    const lots = [
      makeLotCgt({
        capitalGainLossAud: aud(1000),
        isLongTerm: false,
        financialYear: '2023-24',
        lotNumber: 1,
        capitalGainLossUsd: usd(700),
      }),
      makeLotCgt({
        capitalGainLossAud: aud(2000),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 2,
        capitalGainLossUsd: usd(1400),
      }),
      makeLotCgt({
        capitalGainLossAud: aud(-800),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 3,
        capitalGainLossUsd: usd(-500),
      }),
    ]

    const [result] = service.aggregateByFy(lots)

    // Losses applied to short-term first: 1000 - 800 = 200
    expect(result.shortTermAfterLosses).toBeCloseTo(200, 2)
    // Long-term untouched: 2000
    expect(result.longTermAfterLosses).toBeCloseTo(2000, 2)
    // Discount: 2000 × 0.5 = 1000
    expect(result.discountedLongTerm).toBeCloseTo(1000, 2)
    // Net: 200 + 1000 = 1200
    expect(result.netCapitalGain).toBeCloseTo(1200, 2)
    expect(result.netCapitalLoss).toBeCloseTo(0, 2)
    // USD: raw sums, no discount/offset
    expect(result.shortTermGainsUsd).toBeCloseTo(700, 2)
    expect(result.longTermGainsUsd).toBeCloseTo(1400, 2)
    expect(result.totalGainsUsd).toBeCloseTo(2100, 2)
    expect(result.totalLossesUsd).toBeCloseTo(500, 2)
    expect(result.totalGainLossUsd).toBeCloseTo(1600, 2)
  })

  it('Case 4: losses exceed short-term, remainder applied to long-term', () => {
    // Short-term: 500, Long-term: 3000, Losses: 1200
    const lots = [
      makeLotCgt({
        capitalGainLossAud: aud(500),
        isLongTerm: false,
        financialYear: '2023-24',
        lotNumber: 1,
      }),
      makeLotCgt({
        capitalGainLossAud: aud(3000),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 2,
      }),
      makeLotCgt({
        capitalGainLossAud: aud(-1200),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 3,
      }),
    ]

    const [result] = service.aggregateByFy(lots)

    // Short-term: 500 - 1200 → 0 (remaining losses: 700)
    expect(result.shortTermAfterLosses).toBeCloseTo(0, 2)
    // Long-term: 3000 - 700 = 2300
    expect(result.longTermAfterLosses).toBeCloseTo(2300, 2)
    // Net: 0 + 2300 × 0.5 = 1150
    expect(result.netCapitalGain).toBeCloseTo(1150, 2)
    expect(result.netCapitalLoss).toBeCloseTo(0, 2)
  })

  it('Case 5: losses exceed all gains — net capital loss', () => {
    // Short-term: 200, Long-term: 300, Losses: 1000
    const lots = [
      makeLotCgt({
        capitalGainLossAud: aud(200),
        isLongTerm: false,
        financialYear: '2023-24',
        lotNumber: 1,
      }),
      makeLotCgt({
        capitalGainLossAud: aud(300),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 2,
      }),
      makeLotCgt({
        capitalGainLossAud: aud(-1000),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 3,
      }),
    ]

    const [result] = service.aggregateByFy(lots)

    expect(result.shortTermAfterLosses).toBeCloseTo(0, 2)
    expect(result.longTermAfterLosses).toBeCloseTo(0, 2)
    expect(result.discountAmount).toBeCloseTo(0, 2)
    expect(result.netCapitalGain).toBeCloseTo(0, 2)
    // Excess losses: 1000 - 200 - 300 = 500
    expect(result.netCapitalLoss).toBeCloseTo(500, 2)
  })

  it('Case 6: only losses, no gains', () => {
    const lots = [
      makeLotCgt({
        capitalGainLossAud: aud(-3000),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 1,
      }),
      makeLotCgt({
        capitalGainLossAud: aud(-500),
        isLongTerm: false,
        financialYear: '2023-24',
        lotNumber: 2,
      }),
    ]

    const [result] = service.aggregateByFy(lots)

    expect(result.shortTermGains).toBeCloseTo(0, 2)
    expect(result.longTermGains).toBeCloseTo(0, 2)
    expect(result.totalLosses).toBeCloseTo(3500, 2)
    expect(result.netCapitalGain).toBeCloseTo(0, 2)
    expect(result.netCapitalLoss).toBeCloseTo(3500, 2)
  })

  it('Case 7: mixed short-term and long-term losses both contribute to total', () => {
    // Short-term loss: -400, Long-term loss: -600, Short-term gain: 800
    const lots = [
      makeLotCgt({
        capitalGainLossAud: aud(800),
        isLongTerm: false,
        financialYear: '2023-24',
        lotNumber: 1,
      }),
      makeLotCgt({
        capitalGainLossAud: aud(-400),
        isLongTerm: false,
        financialYear: '2023-24',
        lotNumber: 2,
      }),
      makeLotCgt({
        capitalGainLossAud: aud(-600),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 3,
      }),
    ]

    const [result] = service.aggregateByFy(lots)

    expect(result.shortTermLosses).toBeCloseTo(400, 2)
    expect(result.longTermLosses).toBeCloseTo(600, 2)
    expect(result.totalLosses).toBeCloseTo(1000, 2)

    // Losses applied to short-term first: 800 - 1000 → 0 (remaining: 200)
    expect(result.shortTermAfterLosses).toBeCloseTo(0, 2)
    // No long-term gains to offset
    expect(result.longTermAfterLosses).toBeCloseTo(0, 2)
    // Excess losses: 200
    expect(result.netCapitalGain).toBeCloseTo(0, 2)
    expect(result.netCapitalLoss).toBeCloseTo(200, 2)
  })

  it('Case 8: multiple FYs — each aggregated independently', () => {
    const lots = [
      // FY 2022-23: gain of 2000 (long-term)
      makeLotCgt({
        capitalGainLossAud: aud(2000),
        isLongTerm: true,
        financialYear: '2022-23',
        lotNumber: 1,
      }),
      // FY 2023-24: gain of 500 (short-term) + loss of 300
      makeLotCgt({
        capitalGainLossAud: aud(500),
        isLongTerm: false,
        financialYear: '2023-24',
        lotNumber: 2,
      }),
      makeLotCgt({
        capitalGainLossAud: aud(-300),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 3,
      }),
    ]

    const results = service.aggregateByFy(lots)
    expect(results).toHaveLength(2)

    const fy2223 = results.find((r) => r.financialYear === '2022-23')!
    // 2000 long-term, no losses → discount to 1000
    expect(fy2223.netCapitalGain).toBeCloseTo(1000, 2)
    expect(fy2223.lots).toHaveLength(1)

    const fy2324 = results.find((r) => r.financialYear === '2023-24')!
    // 500 short-term - 300 loss = 200 short-term after losses, no long-term
    expect(fy2324.netCapitalGain).toBeCloseTo(200, 2)
    expect(fy2324.lots).toHaveLength(2)
  })

  it('Case 9: empty input — returns empty array', () => {
    const results = service.aggregateByFy([])
    expect(results).toEqual([])
  })

  it('Case 10: full FyCgtSummary field verification', () => {
    // Short-term gains: 1500, Long-term gains: 4000, Losses: 2000
    // Step 1: losses to short-term: 1500 - 2000 → 0 (remaining: 500)
    // Step 2: losses to long-term: 4000 - 500 = 3500
    // Step 3: discount: 3500 × 0.5 = 1750
    // Step 4: net = 0 + 1750 = 1750
    const lots = [
      makeLotCgt({
        capitalGainLossAud: aud(1500),
        isLongTerm: false,
        financialYear: '2023-24',
        lotNumber: 1,
        capitalGainLossUsd: usd(1000),
      }),
      makeLotCgt({
        capitalGainLossAud: aud(4000),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 2,
        capitalGainLossUsd: usd(2800),
      }),
      makeLotCgt({
        capitalGainLossAud: aud(-1200),
        isLongTerm: true,
        financialYear: '2023-24',
        lotNumber: 3,
        capitalGainLossUsd: usd(-900),
      }),
      makeLotCgt({
        capitalGainLossAud: aud(-800),
        isLongTerm: false,
        financialYear: '2023-24',
        lotNumber: 4,
        capitalGainLossUsd: usd(-600),
      }),
    ]

    const [result] = service.aggregateByFy(lots)

    expect(result.financialYear).toBe('2023-24')
    expect(result.lots).toHaveLength(4)

    // Categorized gains (AUD)
    expect(result.shortTermGains).toBeCloseTo(1500, 2)
    expect(result.longTermGains).toBeCloseTo(4000, 2)
    expect(result.totalGains).toBeCloseTo(5500, 2)

    // Losses (AUD)
    expect(result.shortTermLosses).toBeCloseTo(800, 2)
    expect(result.longTermLosses).toBeCloseTo(1200, 2)
    expect(result.totalLosses).toBeCloseTo(2000, 2)

    // After loss offsetting (AUD)
    expect(result.shortTermAfterLosses).toBeCloseTo(0, 2)
    expect(result.longTermAfterLosses).toBeCloseTo(3500, 2)

    // After discount (AUD)
    expect(result.discountAmount).toBeCloseTo(1750, 2)
    expect(result.discountedLongTerm).toBeCloseTo(1750, 2)

    // Final (AUD)
    expect(result.netCapitalGain).toBeCloseTo(1750, 2)
    expect(result.netCapitalLoss).toBeCloseTo(0, 2)

    // USD: raw sums, no discount/offset
    expect(result.shortTermGainsUsd).toBeCloseTo(1000, 2)
    expect(result.longTermGainsUsd).toBeCloseTo(2800, 2)
    expect(result.totalGainsUsd).toBeCloseTo(3800, 2)
    expect(result.shortTermLossesUsd).toBeCloseTo(600, 2)
    expect(result.longTermLossesUsd).toBeCloseTo(900, 2)
    expect(result.totalLossesUsd).toBeCloseTo(1500, 2)
    expect(result.totalGainLossUsd).toBeCloseTo(2300, 2)
  })
})
