import { describe, it, expect } from 'vitest'
import { createDashboardService } from './dashboard.service'
import type { DashboardSummary } from './dashboard.service'
import type { ReleaseEssIncome } from './ess-income.service'
import type { FyCgtSummary } from './cgt.service'
import type { Award, SaleLot } from '@/types'
import { aud, usd } from '@/types'
import { d } from '@/test-helpers'

// ── Test helpers ────────────────────────────────────────────────────

function makeReleaseIncome(
  overrides: Partial<ReleaseEssIncome> &
    Pick<ReleaseEssIncome, 'releaseDate' | 'sharesVested' | 'totalEssIncomeAud' | 'financialYear'>,
): ReleaseEssIncome {
  return {
    releaseRef: overrides.releaseRef ?? 'RB-TEST',
    grantNumber: overrides.grantNumber ?? 9375,
    releaseDate: overrides.releaseDate,
    sharesVested: overrides.sharesVested,
    fmvPerShare: overrides.fmvPerShare ?? usd(150),
    standardShares: overrides.standardShares ?? overrides.sharesVested,
    standardIncomeUsd: overrides.standardIncomeUsd ?? usd(0),
    standardIncomeAud: overrides.standardIncomeAud ?? overrides.totalEssIncomeAud,
    standardForexRate: overrides.standardForexRate ?? 0.75,
    standardForexDate: overrides.standardForexDate ?? overrides.releaseDate,
    thirtyDayLots: overrides.thirtyDayLots ?? [],
    totalEssIncomeAud: overrides.totalEssIncomeAud,
    totalEssIncomeUsd: overrides.totalEssIncomeUsd ?? usd(0),
    financialYear: overrides.financialYear,
  }
}

function makeFyCgtSummary(
  overrides: Partial<FyCgtSummary> &
    Pick<FyCgtSummary, 'financialYear' | 'netCapitalGain' | 'netCapitalLoss'>,
): FyCgtSummary {
  return {
    financialYear: overrides.financialYear,
    lots: overrides.lots ?? [],
    shortTermGains: overrides.shortTermGains ?? aud(0),
    longTermGains: overrides.longTermGains ?? aud(0),
    totalGains: overrides.totalGains ?? aud(0),
    shortTermLosses: overrides.shortTermLosses ?? aud(0),
    longTermLosses: overrides.longTermLosses ?? aud(0),
    totalLosses: overrides.totalLosses ?? aud(0),
    shortTermAfterLosses: overrides.shortTermAfterLosses ?? aud(0),
    longTermAfterLosses: overrides.longTermAfterLosses ?? aud(0),
    discountAmount: overrides.discountAmount ?? aud(0),
    discountedLongTerm: overrides.discountedLongTerm ?? aud(0),
    netCapitalGain: overrides.netCapitalGain,
    netCapitalLoss: overrides.netCapitalLoss,
    shortTermGainsUsd: overrides.shortTermGainsUsd ?? usd(0),
    longTermGainsUsd: overrides.longTermGainsUsd ?? usd(0),
    shortTermLossesUsd: overrides.shortTermLossesUsd ?? usd(0),
    longTermLossesUsd: overrides.longTermLossesUsd ?? usd(0),
    totalGainsUsd: overrides.totalGainsUsd ?? usd(0),
    totalLossesUsd: overrides.totalLossesUsd ?? usd(0),
    totalGainLossUsd: overrides.totalGainLossUsd ?? usd(0),
  }
}

function makeAward(overrides?: Partial<Award>): Award {
  return {
    grantDate: overrides?.grantDate ?? d(2020, 1, 15),
    grantNumber: overrides?.grantNumber ?? 9375,
    grantType: overrides?.grantType ?? 'Share Units (RSU)',
    grantName: overrides?.grantName ?? 'Test Grant',
    grantReason: overrides?.grantReason ?? 'Refresh',
    conversionPrice: overrides?.conversionPrice ?? usd(0),
    sharesGranted: overrides?.sharesGranted ?? 100,
  }
}

function makeSaleLot(
  overrides: Partial<SaleLot> & Pick<SaleLot, 'saleDate' | 'sharesSold'>,
): SaleLot {
  return {
    withdrawalReferenceNumber: overrides.withdrawalReferenceNumber ?? 'WRC-TEST',
    originatingReleaseRef: overrides.originatingReleaseRef ?? 'RB-TEST',
    grantNumber: overrides.grantNumber ?? 9375,
    grantName: overrides.grantName ?? 'Test Grant',
    lotNumber: overrides.lotNumber ?? 1,
    saleType: overrides.saleType ?? 'Long Shares',
    saleDate: overrides.saleDate,
    originalAcquisitionDate: overrides.originalAcquisitionDate ?? d(2020, 1, 15),
    soldWithin30Days: overrides.soldWithin30Days ?? false,
    costBasisPerShare: overrides.costBasisPerShare ?? usd(100),
    costBasis: overrides.costBasis ?? usd(overrides.sharesSold * 100),
    sharesSold: overrides.sharesSold,
    saleProceeds: overrides.saleProceeds ?? usd(overrides.sharesSold * 150),
    salePricePerShare: overrides.salePricePerShare ?? usd(150),
    brokerageCommission: overrides.brokerageCommission ?? usd(0),
    supplementalTransactionFee: overrides.supplementalTransactionFee ?? usd(0),
  }
}

// ── Tests ───────────────────────────────────────────────────────────

describe('DashboardService', () => {
  const service = createDashboardService()

  describe('summarize', () => {
    it('returns zeroes and empty FY list for empty data', () => {
      const result = service.summarize([], [], [], [])

      expect(result).toEqual<DashboardSummary>({
        totalEssIncomeAud: aud(0),
        netCapitalGainsAud: aud(0),
        totalCapitalLossesAud: aud(0),
        totalEssIncomeUsd: usd(0),
        netCapitalGainsUsd: usd(0),
        totalCapitalLossesUsd: usd(0),
        awardsCount: 0,
        totalSharesVested: 0,
        totalSharesSold: 0,
        availableFinancialYears: [],
      })
    })

    it('aggregates single FY correctly with no filter', () => {
      const awards = [makeAward()]
      const releases = [
        makeReleaseIncome({
          releaseDate: d(2022, 8, 15),
          sharesVested: 30,
          totalEssIncomeAud: aud(5000),
          totalEssIncomeUsd: usd(3500),
          financialYear: '2022-23',
        }),
        makeReleaseIncome({
          releaseDate: d(2023, 2, 15),
          sharesVested: 20,
          totalEssIncomeAud: aud(3000),
          totalEssIncomeUsd: usd(2100),
          financialYear: '2022-23',
        }),
      ]
      const cgtSummaries = [
        makeFyCgtSummary({
          financialYear: '2022-23',
          netCapitalGain: aud(2000),
          netCapitalLoss: aud(500),
          totalGainLossUsd: usd(1800),
          totalLossesUsd: usd(400),
        }),
      ]
      const saleLots = [
        makeSaleLot({ saleDate: d(2022, 10, 1), sharesSold: 15 }),
        makeSaleLot({ saleDate: d(2023, 3, 1), sharesSold: 10 }),
      ]

      const result = service.summarize(awards, releases, cgtSummaries, saleLots)

      expect(result.totalEssIncomeAud).toBe(aud(8000))
      expect(result.netCapitalGainsAud).toBe(aud(2000))
      expect(result.totalCapitalLossesAud).toBe(aud(500))
      expect(result.totalEssIncomeUsd).toBe(usd(5600))
      expect(result.netCapitalGainsUsd).toBe(usd(1800))
      expect(result.totalCapitalLossesUsd).toBe(usd(400))
      expect(result.awardsCount).toBe(1)
      expect(result.totalSharesVested).toBe(50)
      expect(result.totalSharesSold).toBe(25)
      expect(result.availableFinancialYears).toEqual(['2022-23'])
    })

    it("sums across multiple FYs when filter is 'all'", () => {
      const awards = [makeAward(), makeAward({ grantNumber: 14333 })]
      const releases = [
        makeReleaseIncome({
          releaseDate: d(2022, 2, 15),
          sharesVested: 30,
          totalEssIncomeAud: aud(4000),
          financialYear: '2021-22',
        }),
        makeReleaseIncome({
          releaseDate: d(2022, 8, 15),
          sharesVested: 20,
          totalEssIncomeAud: aud(3000),
          financialYear: '2022-23',
        }),
      ]
      const cgtSummaries = [
        makeFyCgtSummary({
          financialYear: '2021-22',
          netCapitalGain: aud(1000),
          netCapitalLoss: aud(200),
        }),
        makeFyCgtSummary({
          financialYear: '2022-23',
          netCapitalGain: aud(1500),
          netCapitalLoss: aud(300),
        }),
      ]
      const saleLots = [
        makeSaleLot({ saleDate: d(2022, 1, 10), sharesSold: 10 }),
        makeSaleLot({ saleDate: d(2022, 9, 10), sharesSold: 15 }),
      ]

      const result = service.summarize(awards, releases, cgtSummaries, saleLots, 'all')

      expect(result.totalEssIncomeAud).toBe(aud(7000))
      expect(result.netCapitalGainsAud).toBe(aud(2500))
      expect(result.totalCapitalLossesAud).toBe(aud(500))
      expect(result.awardsCount).toBe(2)
      expect(result.totalSharesVested).toBe(50)
      expect(result.totalSharesSold).toBe(25)
      expect(result.availableFinancialYears).toEqual(['2021-22', '2022-23'])
    })

    it('filters to specific FY but availableFinancialYears includes all', () => {
      const awards = [makeAward(), makeAward({ grantNumber: 14333 })]
      const releases = [
        makeReleaseIncome({
          releaseDate: d(2022, 2, 15),
          sharesVested: 30,
          totalEssIncomeAud: aud(4000),
          financialYear: '2021-22',
        }),
        makeReleaseIncome({
          releaseDate: d(2022, 8, 15),
          sharesVested: 20,
          totalEssIncomeAud: aud(3000),
          financialYear: '2022-23',
        }),
      ]
      const cgtSummaries = [
        makeFyCgtSummary({
          financialYear: '2021-22',
          netCapitalGain: aud(1000),
          netCapitalLoss: aud(200),
        }),
        makeFyCgtSummary({
          financialYear: '2022-23',
          netCapitalGain: aud(1500),
          netCapitalLoss: aud(300),
        }),
      ]
      const saleLots = [
        makeSaleLot({ saleDate: d(2022, 1, 10), sharesSold: 10 }),
        makeSaleLot({ saleDate: d(2022, 9, 10), sharesSold: 15 }),
      ]

      const result = service.summarize(awards, releases, cgtSummaries, saleLots, '2022-23')

      // Only FY 2022-23 data in totals
      expect(result.totalEssIncomeAud).toBe(aud(3000))
      expect(result.netCapitalGainsAud).toBe(aud(1500))
      expect(result.totalCapitalLossesAud).toBe(aud(300))
      expect(result.totalSharesVested).toBe(20)
      expect(result.totalSharesSold).toBe(15)
      // Awards not filtered by FY
      expect(result.awardsCount).toBe(2)
      // Available FYs always shows all, regardless of filter
      expect(result.availableFinancialYears).toEqual(['2021-22', '2022-23'])
    })

    it('sorts available FYs chronologically', () => {
      const releases = [
        makeReleaseIncome({
          releaseDate: d(2023, 8, 1),
          sharesVested: 10,
          totalEssIncomeAud: aud(1000),
          financialYear: '2023-24',
        }),
      ]
      const cgtSummaries = [
        makeFyCgtSummary({
          financialYear: '2020-21',
          netCapitalGain: aud(500),
          netCapitalLoss: aud(0),
        }),
      ]

      const result = service.summarize([], releases, cgtSummaries, [])

      expect(result.availableFinancialYears).toEqual(['2020-21', '2023-24'])
    })

    it('filters sale lots by saleDate FY', () => {
      const saleLots = [
        makeSaleLot({ saleDate: d(2022, 1, 10), sharesSold: 10 }), // FY 2021-22
        makeSaleLot({ saleDate: d(2022, 9, 10), sharesSold: 15 }), // FY 2022-23
        makeSaleLot({ saleDate: d(2023, 3, 1), sharesSold: 5 }), // FY 2022-23
      ]

      const result = service.summarize([], [], [], saleLots, '2022-23')

      expect(result.totalSharesSold).toBe(20) // 15 + 5
    })
  })
})
