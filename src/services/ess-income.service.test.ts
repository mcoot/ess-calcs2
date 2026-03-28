import { describe, it, expect } from "vitest";
import { createEssIncomeService } from "./ess-income.service";
import type { ReleaseEssIncome } from "./ess-income.service";
import { createForexService } from "./forex.service";
import type { RsuRelease, SaleLot, ForexRate } from "@/types";
import { usd } from "@/types";

// ── Helpers ─────────────────────────────────────────────────────────

function d(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m - 1, day));
}

function makeRelease(overrides: Partial<RsuRelease> & Pick<RsuRelease, "releaseDate" | "sharesVested" | "fmvPerShare" | "releaseReferenceNumber">): RsuRelease {
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

function makeSaleLot(overrides: Partial<SaleLot> & Pick<SaleLot, "originatingReleaseRef" | "saleDate" | "originalAcquisitionDate" | "soldWithin30Days" | "sharesSold" | "saleProceeds">): SaleLot {
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

// ── Forex rates covering all test dates ─────────────────────────────

const TEST_RATES: ForexRate[] = [
  // 2020: covers Case 1 (18-Feb-2020 is a Tuesday)
  { date: d(2020, 2, 18), audToUsd: 0.6700 },

  // 2023: covers Case 2 (13-Feb-2023 is a Monday)
  { date: d(2023, 2, 13), audToUsd: 0.6921 },

  // Two different dates for Case 3
  { date: d(2023, 5, 15), audToUsd: 0.6650 },
  { date: d(2023, 11, 13), audToUsd: 0.6400 },

  // FY boundary: covers Cases 4 & 5
  { date: d(2024, 2, 18), audToUsd: 0.6500 },
  // 28-Jun is a Friday, 30-Jun is a Sunday (no rate), 1-Jul is Monday
  { date: d(2024, 6, 28), audToUsd: 0.6600 },
  { date: d(2024, 7, 1), audToUsd: 0.6610 },
  { date: d(2024, 8, 13), audToUsd: 0.6550 },

  // Case 6: weekend fallback — 15-Mar-2025 is Saturday, 14-Mar is Friday
  { date: d(2025, 3, 14), audToUsd: 0.6300 },

  // Case 7: gap in data — 19-Mar-2025 is Wednesday with no rate, 18-Mar has one
  { date: d(2025, 3, 18), audToUsd: 0.6310 },

  // Cases 9-11
  { date: d(2025, 5, 13), audToUsd: 0.6450 },
];

describe("EssIncomeService — standard case (no 30-day rule)", () => {
  const forex = createForexService(TEST_RATES);
  const service = createEssIncomeService(forex);

  it("Case 1: simple release, no sale lots", () => {
    const release = makeRelease({
      releaseDate: d(2020, 2, 18),
      sharesVested: 30,
      fmvPerShare: usd(153.88),
      releaseReferenceNumber: "RB6538C8B1",
    });

    const [result] = service.calculateByRelease([release], []);

    expect(result.releaseRef).toBe("RB6538C8B1");
    expect(result.sharesVested).toBe(30);
    expect(result.fmvPerShare).toBe(usd(153.88));
    expect(result.standardShares).toBe(30);
    expect(result.standardIncomeUsd).toBeCloseTo(4616.40, 2);
    // 4616.40 / 0.6700 = 6890.149... → 6890.15
    expect(result.standardIncomeAud).toBeCloseTo(6890.15, 2);
    expect(result.thirtyDayLots).toEqual([]);
    expect(result.totalEssIncomeAud).toBe(result.standardIncomeAud);
    expect(result.financialYear).toBe("2019-20");
  });

  it("Case 2: non-30-day sale lots do not reduce standard shares", () => {
    const release = makeRelease({
      releaseDate: d(2023, 2, 13),
      sharesVested: 57,
      fmvPerShare: usd(175.56),
      releaseReferenceNumber: "RBA3C416E9",
    });

    const saleLot = makeSaleLot({
      originatingReleaseRef: "RBA3C416E9",
      saleDate: d(2023, 11, 15),
      originalAcquisitionDate: d(2023, 2, 13),
      soldWithin30Days: false,
      sharesSold: 31,
      saleProceeds: usd(5000),
    });

    const [result] = service.calculateByRelease([release], [saleLot]);

    expect(result.standardShares).toBe(57);
    // 57 × 175.56 = 10006.92
    expect(result.standardIncomeUsd).toBeCloseTo(10006.92, 2);
    // 10006.92 / 0.6921 = 14458.777...
    expect(result.standardIncomeAud).toBeCloseTo(14458.78, 2);
    expect(result.thirtyDayLots).toEqual([]);
    expect(result.totalEssIncomeAud).toBe(result.standardIncomeAud);
  });

  it("Case 3: multiple releases produce independent results with own forex rates", () => {
    const release1 = makeRelease({
      releaseDate: d(2023, 5, 15),
      sharesVested: 20,
      fmvPerShare: usd(200.00),
      releaseReferenceNumber: "REL-A",
      grantNumber: 1001,
    });
    const release2 = makeRelease({
      releaseDate: d(2023, 11, 13),
      sharesVested: 10,
      fmvPerShare: usd(180.00),
      releaseReferenceNumber: "REL-B",
      grantNumber: 1002,
    });

    const results = service.calculateByRelease([release1, release2], []);

    expect(results).toHaveLength(2);

    // Release 1: 20 × 200 = 4000 USD, / 0.6650 = 6015.037... → 6015.04
    const r1 = results.find((r) => r.releaseRef === "REL-A")!;
    expect(r1.standardIncomeUsd).toBeCloseTo(4000.00, 2);
    expect(r1.standardIncomeAud).toBeCloseTo(6015.04, 2);
    expect(r1.standardForexRate).toBe(0.6650);

    // Release 2: 10 × 180 = 1800 USD, / 0.6400 = 2812.50
    const r2 = results.find((r) => r.releaseRef === "REL-B")!;
    expect(r2.standardIncomeUsd).toBeCloseTo(1800.00, 2);
    expect(r2.standardIncomeAud).toBeCloseTo(2812.50, 2);
    expect(r2.standardForexRate).toBe(0.6400);
  });

  it("Case 4: FY boundary — 30 June vs 1 July", () => {
    const releaseJun30 = makeRelease({
      releaseDate: d(2024, 6, 30),  // Sunday — forex falls back to Fri 28-Jun
      sharesVested: 10,
      fmvPerShare: usd(100),
      releaseReferenceNumber: "REL-JUN30",
    });
    const releaseJul1 = makeRelease({
      releaseDate: d(2024, 7, 1),
      sharesVested: 10,
      fmvPerShare: usd(100),
      releaseReferenceNumber: "REL-JUL1",
    });

    const results = service.calculateByRelease([releaseJun30, releaseJul1], []);

    const jun = results.find((r) => r.releaseRef === "REL-JUN30")!;
    const jul = results.find((r) => r.releaseRef === "REL-JUL1")!;

    expect(jun.financialYear).toBe("2023-24");
    expect(jul.financialYear).toBe("2024-25");
  });

  it("Case 5: FY string format is YYYY-YY", () => {
    const releaseFeb = makeRelease({
      releaseDate: d(2024, 2, 18),
      sharesVested: 5,
      fmvPerShare: usd(100),
      releaseReferenceNumber: "REL-FEB",
    });
    const releaseAug = makeRelease({
      releaseDate: d(2024, 8, 13),
      sharesVested: 5,
      fmvPerShare: usd(100),
      releaseReferenceNumber: "REL-AUG",
    });

    const results = service.calculateByRelease([releaseFeb, releaseAug], []);

    const feb = results.find((r) => r.releaseRef === "REL-FEB")!;
    const aug = results.find((r) => r.releaseRef === "REL-AUG")!;

    expect(feb.financialYear).toBe("2023-24");
    expect(aug.financialYear).toBe("2024-25");
    // Verify format: 4 digits, dash, 2 digits
    expect(feb.financialYear).toMatch(/^\d{4}-\d{2}$/);
    expect(aug.financialYear).toMatch(/^\d{4}-\d{2}$/);
  });

  it("Case 6: vest date on weekend — forex falls back to prior business day", () => {
    // 15-Mar-2025 is Saturday; nearest prior rate is 14-Mar-2025 (Friday) at 0.6300
    const release = makeRelease({
      releaseDate: d(2025, 3, 15),
      sharesVested: 10,
      fmvPerShare: usd(200),
      releaseReferenceNumber: "REL-WKND",
    });

    const [result] = service.calculateByRelease([release], []);

    // Forex should fall back to Friday 14-Mar
    expect(result.standardForexRate).toBe(0.6300);
    expect(result.standardForexDate).toEqual(d(2025, 3, 14));
    // AUD: 2000 / 0.63 = 3174.603... → 3174.60
    expect(result.standardIncomeAud).toBeCloseTo(3174.60, 2);
  });

  it("Case 7: vest date on gap day — forex falls back to prior available date", () => {
    // 19-Mar-2025 is Wednesday, no rate; nearest prior is 18-Mar at 0.6310
    const release = makeRelease({
      releaseDate: d(2025, 3, 19),
      sharesVested: 10,
      fmvPerShare: usd(200),
      releaseReferenceNumber: "REL-GAP",
    });

    const [result] = service.calculateByRelease([release], []);

    expect(result.standardForexRate).toBe(0.6310);
    expect(result.standardForexDate).toEqual(d(2025, 3, 18));
    // AUD: 2000 / 0.6310 = 3169.572... → 3169.57
    expect(result.standardIncomeAud).toBeCloseTo(3169.57, 2);
  });

  it("Case 8: empty sale lots array vs no matching sale lots produce identical results", () => {
    const release = makeRelease({
      releaseDate: d(2023, 2, 13),
      sharesVested: 10,
      fmvPerShare: usd(175.56),
      releaseReferenceNumber: "REL-EMPTY",
    });

    // Unrelated sale lot that doesn't reference this release
    const unrelatedLot = makeSaleLot({
      originatingReleaseRef: "SOME-OTHER-REL",
      saleDate: d(2023, 5, 15),
      originalAcquisitionDate: d(2023, 2, 13),
      soldWithin30Days: false,
      sharesSold: 5,
      saleProceeds: usd(1000),
    });

    const [withEmpty] = service.calculateByRelease([release], []);
    const [withUnrelated] = service.calculateByRelease([release], [unrelatedLot]);

    expect(withEmpty.standardShares).toBe(withUnrelated.standardShares);
    expect(withEmpty.standardIncomeUsd).toBe(withUnrelated.standardIncomeUsd);
    expect(withEmpty.standardIncomeAud).toBe(withUnrelated.standardIncomeAud);
    expect(withEmpty.thirtyDayLots).toEqual(withUnrelated.thirtyDayLots);
    expect(withEmpty.totalEssIncomeAud).toBe(withUnrelated.totalEssIncomeAud);
  });

  it("Case 9: single share release", () => {
    const release = makeRelease({
      releaseDate: d(2025, 5, 13),
      sharesVested: 1,
      fmvPerShare: usd(229.52),
      releaseReferenceNumber: "REL-SINGLE",
    });

    const [result] = service.calculateByRelease([release], []);

    expect(result.standardShares).toBe(1);
    expect(result.standardIncomeUsd).toBeCloseTo(229.52, 2);
    // 229.52 / 0.6450 = 355.844... → 355.84
    expect(result.standardIncomeAud).toBeCloseTo(355.84, 2);
  });

  it("Case 10: AUD rounding to 2 decimal places", () => {
    // 30 × 153.88 = 4616.40; 4616.40 / 0.6700 = 6891.04477... → 6891.04
    const release = makeRelease({
      releaseDate: d(2020, 2, 18),
      sharesVested: 30,
      fmvPerShare: usd(153.88),
      releaseReferenceNumber: "REL-ROUND",
    });

    const [result] = service.calculateByRelease([release], []);

    // Verify it's exactly 2dp, not floating-point noise
    const audStr = result.standardIncomeAud.toFixed(2);
    expect(result.standardIncomeAud).toBe(parseFloat(audStr));
    expect(result.totalEssIncomeAud).toBe(parseFloat(result.totalEssIncomeAud.toFixed(2)));
  });

  it("Case 11: result includes correct forex metadata for audit trail", () => {
    const release = makeRelease({
      releaseDate: d(2023, 2, 13),
      sharesVested: 10,
      fmvPerShare: usd(175.56),
      releaseReferenceNumber: "REL-AUDIT",
    });

    const [result] = service.calculateByRelease([release], []);

    // Forex metadata must match what the forex service returns for 13-Feb-2023
    expect(result.standardForexRate).toBe(0.6921);
    expect(result.standardForexDate).toEqual(d(2023, 2, 13));
    expect(result.releaseDate).toEqual(d(2023, 2, 13));
    expect(result.grantNumber).toBe(9375);
    expect(result.releaseRef).toBe("REL-AUDIT");
  });
});
