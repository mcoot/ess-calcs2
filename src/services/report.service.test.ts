import { describe, it, expect } from "vitest";
import { createReportService } from "./report.service";
import { createEssIncomeService } from "./ess-income.service";
import { createCgtService } from "./cgt.service";
import { createForexService } from "./forex.service";
import type { RsuRelease, SaleLot, ForexRate } from "@/types";
import { usd, aud } from "@/types";
import { d } from "@/test-helpers";

// ── Test helpers ────────────────────────────────────────────────────

function makeRelease(
  overrides: Partial<RsuRelease> &
    Pick<RsuRelease, "releaseDate" | "sharesVested" | "fmvPerShare" | "releaseReferenceNumber">,
): RsuRelease {
  return {
    grantDate: overrides.grantDate ?? overrides.releaseDate,
    grantNumber: overrides.grantNumber ?? 9375,
    grantName: overrides.grantName ?? "Test Grant",
    grantReason: overrides.grantReason ?? "Refresh",
    releaseDate: overrides.releaseDate,
    sharesVested: overrides.sharesVested,
    sharesSoldToCover: overrides.sharesSoldToCover ?? 0,
    sharesHeld: overrides.sharesHeld ?? overrides.sharesVested,
    valueUsd: overrides.valueUsd ?? usd(overrides.sharesVested * (overrides.fmvPerShare as number)),
    fmvPerShare: overrides.fmvPerShare,
    sellToCoverAmount: overrides.sellToCoverAmount ?? usd(0),
    releaseReferenceNumber: overrides.releaseReferenceNumber,
  };
}

function makeSaleLot(
  overrides: Partial<SaleLot> &
    Pick<SaleLot, "originatingReleaseRef" | "saleDate" | "originalAcquisitionDate" | "soldWithin30Days" | "sharesSold" | "saleProceeds">,
): SaleLot {
  return {
    withdrawalReferenceNumber: overrides.withdrawalReferenceNumber ?? "WRC-TEST-1",
    originatingReleaseRef: overrides.originatingReleaseRef,
    grantNumber: overrides.grantNumber ?? 9375,
    grantName: overrides.grantName ?? "Test Grant",
    lotNumber: overrides.lotNumber ?? 1,
    saleType: overrides.saleType ?? "Long Shares",
    saleDate: overrides.saleDate,
    originalAcquisitionDate: overrides.originalAcquisitionDate,
    soldWithin30Days: overrides.soldWithin30Days,
    costBasisPerShare: overrides.costBasisPerShare ?? usd(100),
    costBasis: overrides.costBasis ?? usd(overrides.sharesSold * 100),
    sharesSold: overrides.sharesSold,
    saleProceeds: overrides.saleProceeds,
    salePricePerShare: overrides.salePricePerShare ?? usd(150),
    brokerageCommission: overrides.brokerageCommission ?? usd(0),
    supplementalTransactionFee: overrides.supplementalTransactionFee ?? usd(0),
  };
}

// ── Forex rates covering test dates ─────────────────────────────────

const TEST_RATES: ForexRate[] = [
  // FY 2022-23 (Jul 2022 – Jun 2023)
  { date: d(2022, 10, 3), audToUsd: 0.65 },   // Oct 2022
  { date: d(2023, 2, 15), audToUsd: 0.70 },    // Feb 2023

  // FY 2023-24 (Jul 2023 – Jun 2024)
  { date: d(2023, 8, 14), audToUsd: 0.64 },    // Aug 2023
  { date: d(2023, 11, 20), audToUsd: 0.66 },   // Nov 2023
  { date: d(2024, 1, 15), audToUsd: 0.68 },    // Jan 2024
  { date: d(2024, 2, 12), audToUsd: 0.65 },    // Feb 2024 (vest)
  { date: d(2024, 2, 22), audToUsd: 0.67 },    // Feb 2024 (30-day sale)
  { date: d(2024, 3, 18), audToUsd: 0.66 },    // Mar 2024

  // FY 2024-25 (Jul 2024 – Jun 2025)
  { date: d(2024, 9, 2), audToUsd: 0.68 },     // Sep 2024
  { date: d(2025, 1, 13), audToUsd: 0.63 },    // Jan 2025
];

const forex = createForexService(TEST_RATES);

// ── Tests ───────────────────────────────────────────────────────────

describe("ReportService", () => {
  describe("generateFyReport — standard ESS income rows", () => {
    it("produces one row per release with correct fields", () => {
      const releases: RsuRelease[] = [
        makeRelease({
          releaseDate: d(2023, 8, 14),
          sharesVested: 100,
          fmvPerShare: usd(150),
          releaseReferenceNumber: "RB-001",
          grantNumber: 9375,
          grantName: "2018 RSU Grant (New Hire)",
        }),
        makeRelease({
          releaseDate: d(2023, 11, 20),
          sharesVested: 50,
          fmvPerShare: usd(200),
          releaseReferenceNumber: "RB-002",
          grantNumber: 14333,
          grantName: "2020 RSU Grant (Refresh)",
        }),
      ];

      const essIncome = createEssIncomeService(forex);
      const cgt = createCgtService(forex);
      const svc = createReportService();

      const report = svc.generateFyReport("2023-24", releases, [], essIncome, cgt);

      expect(report.financialYear).toBe("2023-24");
      expect(report.essIncomeRows).toHaveLength(2);

      const row0 = report.essIncomeRows[0];
      expect(row0.date).toEqual(d(2023, 8, 14));
      expect(row0.grantNumber).toBe(9375);
      expect(row0.grantName).toBe("2018 RSU Grant (New Hire)");
      expect(row0.releaseRef).toBe("RB-001");
      expect(row0.shares).toBe(100);
      expect(row0.fmvPerShareUsd).toBe(usd(150));
      expect(row0.is30DayRule).toBe(false);
      expect(row0.notes).toBe("");

      const row1 = report.essIncomeRows[1];
      expect(row1.grantNumber).toBe(14333);
      expect(row1.grantName).toBe("2020 RSU Grant (Refresh)");
      expect(row1.shares).toBe(50);

      // Total should equal sum of both rows (rounded to 2dp)
      const expectedTotal = (row0.essIncomeAud as number) + (row1.essIncomeAud as number);
      expect(report.essIncomeTotalAud as number).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe("generateFyReport — 30-day rule", () => {
    it("produces 30-day ESS row and cross-reference summary row", () => {
      const vestDate = d(2024, 2, 12);
      const saleDate = d(2024, 2, 22); // 10 days after vest

      const releases: RsuRelease[] = [
        makeRelease({
          releaseDate: vestDate,
          sharesVested: 80,
          fmvPerShare: usd(100),
          releaseReferenceNumber: "RB-30D",
          grantName: "30-Day Grant",
        }),
      ];

      const saleLots: SaleLot[] = [
        makeSaleLot({
          originatingReleaseRef: "RB-30D",
          saleDate,
          originalAcquisitionDate: vestDate,
          soldWithin30Days: true,
          sharesSold: 30,
          saleProceeds: usd(4500),
          grantName: "30-Day Grant",
        }),
      ];

      const essIncome = createEssIncomeService(forex);
      const cgt = createCgtService(forex);
      const svc = createReportService();

      const report = svc.generateFyReport("2023-24", releases, saleLots, essIncome, cgt);

      // Should have 2 ESS rows: one standard (50 shares) and one 30-day (30 shares)
      expect(report.essIncomeRows).toHaveLength(2);

      const standardRow = report.essIncomeRows.find((r) => !r.is30DayRule);
      expect(standardRow).toBeDefined();
      expect(standardRow!.shares).toBe(50); // 80 vested - 30 sold in 30 days

      const thirtyDayRow = report.essIncomeRows.find((r) => r.is30DayRule);
      expect(thirtyDayRow).toBeDefined();
      expect(thirtyDayRow!.shares).toBe(30);
      expect(thirtyDayRow!.date).toEqual(saleDate);
      expect(thirtyDayRow!.is30DayRule).toBe(true);
      expect(thirtyDayRow!.notes).toContain("10");

      // 30-day summary section
      expect(report.thirtyDaySummaryRows).toHaveLength(1);
      const summaryRow = report.thirtyDaySummaryRows[0];
      expect(summaryRow.saleDate).toEqual(saleDate);
      expect(summaryRow.vestDate).toEqual(vestDate);
      expect(summaryRow.daysHeld).toBe(10);
      expect(summaryRow.shares).toBe(30);
      expect(summaryRow.grantName).toBe("30-Day Grant");
    });
  });

  describe("generateFyReport — CGT rows", () => {
    it("maps sale lots to CGT rows, excludes 30-day lots", () => {
      const releases: RsuRelease[] = [
        makeRelease({
          releaseDate: d(2022, 10, 3),
          sharesVested: 100,
          fmvPerShare: usd(100),
          releaseReferenceNumber: "RB-CGT",
          grantName: "CGT Grant",
        }),
      ];

      const saleLots: SaleLot[] = [
        // Long-term lot (>365 days held)
        makeSaleLot({
          originatingReleaseRef: "RB-CGT",
          saleDate: d(2024, 1, 15),
          originalAcquisitionDate: d(2022, 10, 3),
          soldWithin30Days: false,
          sharesSold: 20,
          saleProceeds: usd(3000),
          costBasis: usd(2000),
          grantName: "CGT Grant",
          lotNumber: 1,
        }),
        // Short-term lot
        makeSaleLot({
          originatingReleaseRef: "RB-CGT",
          saleDate: d(2023, 11, 20),
          originalAcquisitionDate: d(2023, 8, 14),
          soldWithin30Days: false,
          sharesSold: 10,
          saleProceeds: usd(1800),
          costBasis: usd(1500),
          grantName: "CGT Grant",
          lotNumber: 2,
          withdrawalReferenceNumber: "WRC-TEST-2",
        }),
        // 30-day lot — should be excluded from CGT
        makeSaleLot({
          originatingReleaseRef: "RB-CGT",
          saleDate: d(2023, 11, 20),
          originalAcquisitionDate: d(2023, 11, 20),
          soldWithin30Days: true,
          sharesSold: 5,
          saleProceeds: usd(800),
          grantName: "CGT Grant",
          lotNumber: 3,
          withdrawalReferenceNumber: "WRC-TEST-3",
        }),
      ];

      const essIncome = createEssIncomeService(forex);
      const cgt = createCgtService(forex);
      const svc = createReportService();

      const report = svc.generateFyReport("2023-24", releases, saleLots, essIncome, cgt);

      // Only 2 CGT rows (30-day excluded)
      expect(report.cgtRows).toHaveLength(2);
      expect(report.cgtRows.every((r) => r.grantName === "CGT Grant")).toBe(true);

      const longTermRow = report.cgtRows.find((r) => r.discountEligible);
      expect(longTermRow).toBeDefined();
      expect(longTermRow!.holdingDays).toBeGreaterThan(365);

      // cgtSummary should be the FyCgtSummary from the CGT service
      expect(report.cgtSummary).toBeDefined();
      expect(report.cgtSummary.financialYear).toBe("2023-24");
    });

    it("includes gross proceeds, brokerage, and fees on CGT rows", () => {
      const releases: RsuRelease[] = [
        makeRelease({
          releaseDate: d(2022, 10, 3),
          sharesVested: 50,
          fmvPerShare: usd(100),
          releaseReferenceNumber: "RB-FEES",
        }),
      ];

      const saleLots: SaleLot[] = [
        makeSaleLot({
          originatingReleaseRef: "RB-FEES",
          saleDate: d(2024, 1, 15),
          originalAcquisitionDate: d(2022, 10, 3),
          soldWithin30Days: false,
          sharesSold: 10,
          saleProceeds: usd(3000),
          brokerageCommission: usd(14.95),
          supplementalTransactionFee: usd(0.08),
        }),
      ];

      const essIncome = createEssIncomeService(forex);
      const cgt = createCgtService(forex);
      const svc = createReportService();

      const report = svc.generateFyReport("2023-24", releases, saleLots, essIncome, cgt);

      expect(report.cgtRows).toHaveLength(1);
      const row = report.cgtRows[0];
      expect(row.grossProceedsUsd).toBe(usd(3000));
      expect(row.brokerageUsd).toBe(usd(14.95));
      expect(row.feesUsd).toBe(usd(0.08));
    });
  });

  describe("generateFyReport — FY filtering", () => {
    it("includes only events from the requested FY", () => {
      const releases: RsuRelease[] = [
        makeRelease({
          releaseDate: d(2022, 10, 3), // FY 2022-23
          sharesVested: 40,
          fmvPerShare: usd(100),
          releaseReferenceNumber: "RB-OLD",
          grantName: "Old Grant",
        }),
        makeRelease({
          releaseDate: d(2023, 8, 14), // FY 2023-24
          sharesVested: 60,
          fmvPerShare: usd(120),
          releaseReferenceNumber: "RB-NEW",
          grantName: "New Grant",
        }),
      ];

      const essIncome = createEssIncomeService(forex);
      const cgt = createCgtService(forex);
      const svc = createReportService();

      const report = svc.generateFyReport("2023-24", releases, [], essIncome, cgt);

      expect(report.essIncomeRows).toHaveLength(1);
      expect(report.essIncomeRows[0].releaseRef).toBe("RB-NEW");
    });
  });

  describe("generateFyReport — empty FY", () => {
    it("returns empty report with zero totals", () => {
      const releases: RsuRelease[] = [
        makeRelease({
          releaseDate: d(2023, 8, 14), // FY 2023-24
          sharesVested: 50,
          fmvPerShare: usd(100),
          releaseReferenceNumber: "RB-X",
        }),
      ];

      const essIncome = createEssIncomeService(forex);
      const cgt = createCgtService(forex);
      const svc = createReportService();

      const report = svc.generateFyReport("2024-25", releases, [], essIncome, cgt);

      expect(report.financialYear).toBe("2024-25");
      expect(report.essIncomeRows).toHaveLength(0);
      expect(report.essIncomeTotalAud).toBe(aud(0));
      expect(report.cgtRows).toHaveLength(0);
      expect(report.cgtSummary.netCapitalGain).toBe(aud(0));
      expect(report.thirtyDaySummaryRows).toHaveLength(0);
    });
  });

  describe("generateFyReport — edge cases", () => {
    it("partial data: releases only (no sales) — ESS rows present, CGT empty", () => {
      const releases: RsuRelease[] = [
        makeRelease({
          releaseDate: d(2023, 8, 14),
          sharesVested: 50,
          fmvPerShare: usd(120),
          releaseReferenceNumber: "RB-ONLY",
        }),
      ];

      const essIncome = createEssIncomeService(forex);
      const cgt = createCgtService(forex);
      const svc = createReportService();

      const report = svc.generateFyReport("2023-24", releases, [], essIncome, cgt);

      expect(report.essIncomeRows).toHaveLength(1);
      expect(report.essIncomeRows[0].shares).toBe(50);
      expect(report.cgtRows).toHaveLength(0);
      expect(report.cgtSummary.netCapitalGain).toBe(aud(0));
      expect(report.thirtyDaySummaryRows).toHaveLength(0);
    });

    it("CGT-only FY: sale lots in FY with no vesting releases", () => {
      const releases: RsuRelease[] = [
        makeRelease({
          releaseDate: d(2022, 10, 3), // FY 2022-23, NOT 2024-25
          sharesVested: 50,
          fmvPerShare: usd(100),
          releaseReferenceNumber: "RB-OLD",
        }),
      ];

      const saleLots: SaleLot[] = [
        makeSaleLot({
          originatingReleaseRef: "RB-OLD",
          saleDate: d(2024, 9, 2), // FY 2024-25
          originalAcquisitionDate: d(2022, 10, 3),
          soldWithin30Days: false,
          sharesSold: 10,
          saleProceeds: usd(1800),
        }),
      ];

      const essIncome = createEssIncomeService(forex);
      const cgt = createCgtService(forex);
      const svc = createReportService();

      const report = svc.generateFyReport("2024-25", releases, saleLots, essIncome, cgt);

      expect(report.essIncomeRows).toHaveLength(0);
      expect(report.essIncomeTotalAud).toBe(aud(0));
      expect(report.cgtRows).toHaveLength(1);
      expect(report.cgtRows[0].sharesSold).toBe(10);
    });

    it("zero brokerage and tiny fees still produce correct net proceeds", () => {
      const releases: RsuRelease[] = [
        makeRelease({
          releaseDate: d(2022, 10, 3),
          sharesVested: 50,
          fmvPerShare: usd(100),
          releaseReferenceNumber: "RB-TINY",
        }),
      ];

      const saleLots: SaleLot[] = [
        makeSaleLot({
          originatingReleaseRef: "RB-TINY",
          saleDate: d(2024, 1, 15),
          originalAcquisitionDate: d(2022, 10, 3),
          soldWithin30Days: false,
          sharesSold: 10,
          saleProceeds: usd(2000),
          brokerageCommission: usd(0),
          supplementalTransactionFee: usd(0.01),
        }),
      ];

      const essIncome = createEssIncomeService(forex);
      const cgt = createCgtService(forex);
      const svc = createReportService();

      const report = svc.generateFyReport("2023-24", releases, saleLots, essIncome, cgt);

      expect(report.cgtRows).toHaveLength(1);
      const row = report.cgtRows[0];
      expect(row.brokerageUsd).toBe(usd(0));
      expect(row.feesUsd).toBe(usd(0.01));
      expect(row.grossProceedsUsd).toBe(usd(2000));
      // Net = 2000 - 0 - 0.01 = 1999.99
      expect(row.netProceedsUsd).toBeCloseTo(1999.99, 2);
    });
  });

  describe("availableFinancialYears", () => {
    it("returns sorted unique FYs from releases and sales", () => {
      const releases: RsuRelease[] = [
        makeRelease({
          releaseDate: d(2022, 10, 3), // FY 2022-23
          sharesVested: 10,
          fmvPerShare: usd(100),
          releaseReferenceNumber: "RB-A",
        }),
      ];

      const saleLots: SaleLot[] = [
        makeSaleLot({
          originatingReleaseRef: "RB-A",
          saleDate: d(2024, 1, 15), // FY 2023-24
          originalAcquisitionDate: d(2022, 10, 3),
          soldWithin30Days: false,
          sharesSold: 5,
          saleProceeds: usd(750),
        }),
        makeSaleLot({
          originatingReleaseRef: "RB-A",
          saleDate: d(2024, 9, 2), // FY 2024-25
          originalAcquisitionDate: d(2022, 10, 3),
          soldWithin30Days: false,
          sharesSold: 5,
          saleProceeds: usd(800),
          withdrawalReferenceNumber: "WRC-TEST-2",
        }),
      ];

      const svc = createReportService();
      const fys = svc.availableFinancialYears(releases, saleLots);

      expect(fys).toEqual(["2022-23", "2023-24", "2024-25"]);
    });
  });
});
