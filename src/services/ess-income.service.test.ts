import { describe, it, expect } from "vitest";
import { createEssIncomeService } from "./ess-income.service";
import type { ReleaseEssIncome } from "./ess-income.service";
import { createForexService } from "./forex.service";
import type { RsuRelease, SaleLot, ForexRate } from "@/types";
import { usd } from "@/types";
import { d } from "@/test-helpers";

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

  // 30-day rule test rates
  { date: d(2024, 3, 4), audToUsd: 0.5000 },   // vest date (Monday)
  { date: d(2024, 3, 11), audToUsd: 0.6250 },  // sale date case 1
  { date: d(2024, 3, 8), audToUsd: 0.7000 },   // sale date case 2
  { date: d(2024, 4, 1), audToUsd: 0.8000 },   // multi-lot vest date
  { date: d(2024, 4, 3), audToUsd: 0.6400 },   // multi-lot sale 1
  { date: d(2024, 4, 5), audToUsd: 0.5000 },   // multi-lot sale 2
  { date: d(2024, 4, 8), audToUsd: 0.6000 },   // multi-lot sale 3
  { date: d(2024, 7, 3), audToUsd: 0.6620 },   // cross-FY sale date
  { date: d(2023, 2, 24), audToUsd: 0.6800 },  // spec test case 2 sale date
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

describe("EssIncomeService — 30-day rule", () => {
  const forex = createForexService(TEST_RATES);
  const service = createEssIncomeService(forex);

  it("Case 1: mixed release — some shares 30-day, remainder standard", () => {
    // 20 shares, $100 FMV, vest 4-Mar-2024 (rate 0.5000)
    // 8 shares sold within 30 days on 11-Mar-2024 (rate 0.6250), proceeds $900
    const release = makeRelease({
      releaseDate: d(2024, 3, 4),
      sharesVested: 20,
      fmvPerShare: usd(100),
      releaseReferenceNumber: "REL-MIX",
    });

    const lot = makeSaleLot({
      originatingReleaseRef: "REL-MIX",
      saleDate: d(2024, 3, 11),
      originalAcquisitionDate: d(2024, 3, 4),
      soldWithin30Days: true,
      sharesSold: 8,
      saleProceeds: usd(900),
      withdrawalReferenceNumber: "WRC-MIX-1",
    });

    const [result] = service.calculateByRelease([release], [lot]);

    // Standard: 20 - 8 = 12 shares, USD = 12 × 100 = 1200, AUD = 1200 / 0.5 = 2400.00
    expect(result.standardShares).toBe(12);
    expect(result.standardIncomeUsd).toBeCloseTo(1200, 2);
    expect(result.standardIncomeAud).toBeCloseTo(2400.00, 2);

    // 30-day: 1 lot, proceeds $900, AUD = 900 / 0.625 = 1440.00
    expect(result.thirtyDayLots).toHaveLength(1);
    expect(result.thirtyDayLots[0].sharesSold).toBe(8);
    expect(result.thirtyDayLots[0].saleProceedsUsd).toBeCloseTo(900, 2);
    expect(result.thirtyDayLots[0].essIncomeAud).toBeCloseTo(1440.00, 2);

    // Total = 2400 + 1440 = 3840.00
    expect(result.totalEssIncomeAud).toBeCloseTo(3840.00, 2);
  });

  it("Case 2: all shares sold within 30 days — zero standard shares", () => {
    // 10 shares, $200 FMV, vest 4-Mar-2024 (rate 0.5000)
    // All 10 sold within 30 days on 8-Mar-2024 (rate 0.7000), proceeds $2100
    const release = makeRelease({
      releaseDate: d(2024, 3, 4),
      sharesVested: 10,
      fmvPerShare: usd(200),
      releaseReferenceNumber: "REL-ALL30",
    });

    const lot = makeSaleLot({
      originatingReleaseRef: "REL-ALL30",
      saleDate: d(2024, 3, 8),
      originalAcquisitionDate: d(2024, 3, 4),
      soldWithin30Days: true,
      sharesSold: 10,
      saleProceeds: usd(2100),
      withdrawalReferenceNumber: "WRC-ALL30",
    });

    const [result] = service.calculateByRelease([release], [lot]);

    expect(result.standardShares).toBe(0);
    expect(result.standardIncomeUsd).toBeCloseTo(0, 2);
    expect(result.standardIncomeAud).toBeCloseTo(0, 2);

    // 30-day: proceeds $2100, AUD = 2100 / 0.7 = 3000.00
    expect(result.thirtyDayLots).toHaveLength(1);
    expect(result.thirtyDayLots[0].essIncomeAud).toBeCloseTo(3000.00, 2);
    expect(result.totalEssIncomeAud).toBeCloseTo(3000.00, 2);
  });

  it("Case 3: multiple 30-day lots from one release, each with own forex rate", () => {
    // 20 shares, $200 FMV, vest 1-Apr-2024 (rate 0.8000)
    // 3 lots sold within 30 days totalling 20 shares
    const release = makeRelease({
      releaseDate: d(2024, 4, 1),
      sharesVested: 20,
      fmvPerShare: usd(200),
      releaseReferenceNumber: "REL-MULTI",
    });

    const lot1 = makeSaleLot({
      originatingReleaseRef: "REL-MULTI",
      saleDate: d(2024, 4, 3),    // rate 0.6400
      originalAcquisitionDate: d(2024, 4, 1),
      soldWithin30Days: true,
      sharesSold: 8,
      saleProceeds: usd(1600),
      withdrawalReferenceNumber: "WRC-M1",
      lotNumber: 1,
    });
    const lot2 = makeSaleLot({
      originatingReleaseRef: "REL-MULTI",
      saleDate: d(2024, 4, 5),    // rate 0.5000
      originalAcquisitionDate: d(2024, 4, 1),
      soldWithin30Days: true,
      sharesSold: 5,
      saleProceeds: usd(1000),
      withdrawalReferenceNumber: "WRC-M2",
      lotNumber: 2,
    });
    const lot3 = makeSaleLot({
      originatingReleaseRef: "REL-MULTI",
      saleDate: d(2024, 4, 8),    // rate 0.6000
      originalAcquisitionDate: d(2024, 4, 1),
      soldWithin30Days: true,
      sharesSold: 7,
      saleProceeds: usd(1400),
      withdrawalReferenceNumber: "WRC-M3",
      lotNumber: 3,
    });

    const [result] = service.calculateByRelease([release], [lot1, lot2, lot3]);

    expect(result.standardShares).toBe(0);
    expect(result.thirtyDayLots).toHaveLength(3);

    // Lot 1: 1600 / 0.64 = 2500.00
    const l1 = result.thirtyDayLots.find((l) => l.saleLotRef === "WRC-M1")!;
    expect(l1.essIncomeAud).toBeCloseTo(2500.00, 2);
    expect(l1.forexRate).toBe(0.6400);

    // Lot 2: 1000 / 0.50 = 2000.00
    const l2 = result.thirtyDayLots.find((l) => l.saleLotRef === "WRC-M2")!;
    expect(l2.essIncomeAud).toBeCloseTo(2000.00, 2);
    expect(l2.forexRate).toBe(0.5000);

    // Lot 3: 1400 / 0.60 = 2333.33
    const l3 = result.thirtyDayLots.find((l) => l.saleLotRef === "WRC-M3")!;
    expect(l3.essIncomeAud).toBeCloseTo(2333.33, 2);
    expect(l3.forexRate).toBe(0.6000);

    // Total: 2500 + 2000 + 2333.33 = 6833.33
    expect(result.totalEssIncomeAud).toBeCloseTo(6833.33, 2);
  });

  it("Case 4: 30-day lot forex uses sale date, not vest date", () => {
    // Vest 4-Mar-2024 (rate 0.5000), sale 11-Mar-2024 (rate 0.6250)
    const release = makeRelease({
      releaseDate: d(2024, 3, 4),
      sharesVested: 10,
      fmvPerShare: usd(100),
      releaseReferenceNumber: "REL-FXDATE",
    });

    const lot = makeSaleLot({
      originatingReleaseRef: "REL-FXDATE",
      saleDate: d(2024, 3, 11),
      originalAcquisitionDate: d(2024, 3, 4),
      soldWithin30Days: true,
      sharesSold: 10,
      saleProceeds: usd(1000),
      withdrawalReferenceNumber: "WRC-FXDATE",
    });

    const [result] = service.calculateByRelease([release], [lot]);

    // The lot must use sale date rate (0.6250), NOT vest date rate (0.5000)
    expect(result.thirtyDayLots[0].forexRate).toBe(0.6250);
    expect(result.thirtyDayLots[0].forexDate).toEqual(d(2024, 3, 11));
    // AUD = 1000 / 0.625 = 1600, NOT 1000 / 0.5 = 2000
    expect(result.thirtyDayLots[0].essIncomeAud).toBeCloseTo(1600.00, 2);
  });

  it("Case 5: 30-day lot crossing FY boundary — lot uses sale date FY", () => {
    // Vest 28-Jun-2024 (FY 2023-24, rate 0.6600)
    // Sale 3-Jul-2024 (FY 2024-25, rate 0.6620), within 30 days
    const release = makeRelease({
      releaseDate: d(2024, 6, 28),
      sharesVested: 10,
      fmvPerShare: usd(100),
      releaseReferenceNumber: "REL-CROSSFY",
    });

    const lot = makeSaleLot({
      originatingReleaseRef: "REL-CROSSFY",
      saleDate: d(2024, 7, 3),
      originalAcquisitionDate: d(2024, 6, 28),
      soldWithin30Days: true,
      sharesSold: 10,
      saleProceeds: usd(1050),
      withdrawalReferenceNumber: "WRC-CROSSFY",
    });

    const [result] = service.calculateByRelease([release], [lot]);

    // Release FY is based on vest date: 28-Jun → 2023-24
    expect(result.financialYear).toBe("2023-24");
    // 30-day lot FY is based on sale date: 3-Jul → 2024-25
    expect(result.thirtyDayLots[0].financialYear).toBe("2024-25");
  });

  it("Case 6: 30-day lot audit trail fields fully populated", () => {
    const release = makeRelease({
      releaseDate: d(2024, 3, 4),
      sharesVested: 15,
      fmvPerShare: usd(100),
      releaseReferenceNumber: "REL-AUDIT30",
    });

    const lot = makeSaleLot({
      originatingReleaseRef: "REL-AUDIT30",
      saleDate: d(2024, 3, 11),
      originalAcquisitionDate: d(2024, 3, 4),
      soldWithin30Days: true,
      sharesSold: 5,
      saleProceeds: usd(600),
      withdrawalReferenceNumber: "WRC-AUDIT30",
    });

    const [result] = service.calculateByRelease([release], [lot]);
    const lotResult = result.thirtyDayLots[0];

    expect(lotResult.saleLotRef).toBe("WRC-AUDIT30");
    expect(lotResult.saleDate).toEqual(d(2024, 3, 11));
    expect(lotResult.sharesSold).toBe(5);
    expect(lotResult.saleProceedsUsd).toBeCloseTo(600, 2);
    expect(lotResult.forexRate).toBe(0.6250);
    expect(lotResult.forexDate).toEqual(d(2024, 3, 11));
    // 600 / 0.625 = 960.00
    expect(lotResult.essIncomeAud).toBeCloseTo(960.00, 2);
    expect(lotResult.financialYear).toBe("2023-24");
  });

  it("Case 7: sale lots from other releases are not matched", () => {
    const release1 = makeRelease({
      releaseDate: d(2024, 3, 4),
      sharesVested: 10,
      fmvPerShare: usd(100),
      releaseReferenceNumber: "REL-ONE",
    });
    const release2 = makeRelease({
      releaseDate: d(2024, 3, 4),
      sharesVested: 10,
      fmvPerShare: usd(100),
      releaseReferenceNumber: "REL-TWO",
    });

    // This lot references REL-ONE only
    const lot = makeSaleLot({
      originatingReleaseRef: "REL-ONE",
      saleDate: d(2024, 3, 11),
      originalAcquisitionDate: d(2024, 3, 4),
      soldWithin30Days: true,
      sharesSold: 5,
      saleProceeds: usd(600),
      withdrawalReferenceNumber: "WRC-MATCH",
    });

    const results = service.calculateByRelease([release1, release2], [lot]);

    const r1 = results.find((r) => r.releaseRef === "REL-ONE")!;
    const r2 = results.find((r) => r.releaseRef === "REL-TWO")!;

    expect(r1.thirtyDayLots).toHaveLength(1);
    expect(r1.standardShares).toBe(5);

    expect(r2.thirtyDayLots).toHaveLength(0);
    expect(r2.standardShares).toBe(10);
  });
});

// ── aggregateByFy tests ─────────────────────────────────────────────

function makeReleaseIncome(overrides: Partial<ReleaseEssIncome> & Pick<ReleaseEssIncome, "releaseRef" | "financialYear" | "standardIncomeAud" | "totalEssIncomeAud">): ReleaseEssIncome {
  return {
    releaseRef: overrides.releaseRef,
    grantNumber: overrides.grantNumber ?? 9375,
    releaseDate: overrides.releaseDate ?? d(2024, 1, 1),
    sharesVested: overrides.sharesVested ?? 10,
    fmvPerShare: overrides.fmvPerShare ?? usd(100),
    standardShares: overrides.standardShares ?? 10,
    standardIncomeUsd: overrides.standardIncomeUsd ?? usd(1000),
    standardIncomeAud: overrides.standardIncomeAud,
    standardForexRate: overrides.standardForexRate ?? 0.65,
    standardForexDate: overrides.standardForexDate ?? d(2024, 1, 1),
    thirtyDayLots: overrides.thirtyDayLots ?? [],
    totalEssIncomeAud: overrides.totalEssIncomeAud,
    financialYear: overrides.financialYear,
  };
}

import { aud } from "@/types";

describe("EssIncomeService — aggregateByFy", () => {
  const forex = createForexService(TEST_RATES);
  const service = createEssIncomeService(forex);

  it("Case 1: single FY, all standard — groups and sums correctly", () => {
    const releases = [
      makeReleaseIncome({
        releaseRef: "R1",
        financialYear: "2023-24",
        standardIncomeAud: aud(1000),
        totalEssIncomeAud: aud(1000),
      }),
      makeReleaseIncome({
        releaseRef: "R2",
        financialYear: "2023-24",
        standardIncomeAud: aud(2000),
        totalEssIncomeAud: aud(2000),
      }),
      makeReleaseIncome({
        releaseRef: "R3",
        financialYear: "2023-24",
        standardIncomeAud: aud(500),
        totalEssIncomeAud: aud(500),
      }),
    ];

    const result = service.aggregateByFy(releases);

    expect(result).toHaveLength(1);
    expect(result[0].financialYear).toBe("2023-24");
    expect(result[0].releases).toHaveLength(3);
    expect(result[0].totalEssIncomeAud).toBeCloseTo(3500, 2);
  });

  it("Case 2: multiple FYs — releases split into separate buckets", () => {
    const releases = [
      makeReleaseIncome({
        releaseRef: "R-OLD",
        financialYear: "2022-23",
        standardIncomeAud: aud(800),
        totalEssIncomeAud: aud(800),
      }),
      makeReleaseIncome({
        releaseRef: "R-NEW",
        financialYear: "2024-25",
        standardIncomeAud: aud(1200),
        totalEssIncomeAud: aud(1200),
      }),
    ];

    const result = service.aggregateByFy(releases);

    expect(result).toHaveLength(2);

    const fy2223 = result.find((r) => r.financialYear === "2022-23")!;
    expect(fy2223.releases).toHaveLength(1);
    expect(fy2223.totalEssIncomeAud).toBeCloseTo(800, 2);

    const fy2425 = result.find((r) => r.financialYear === "2024-25")!;
    expect(fy2425.releases).toHaveLength(1);
    expect(fy2425.totalEssIncomeAud).toBeCloseTo(1200, 2);
  });

  it("Case 3: cross-FY 30-day lot — income attributed to correct FYs", () => {
    // Release vests in FY 2023-24, standard portion = 600 AUD
    // 30-day lot sold in FY 2024-25, lot income = 900 AUD
    // Release's totalEssIncomeAud = 1500, but that should be split across FYs
    const release = makeReleaseIncome({
      releaseRef: "R-CROSS",
      financialYear: "2023-24",
      standardIncomeAud: aud(600),
      totalEssIncomeAud: aud(1500),
      standardShares: 4,
      sharesVested: 10,
      thirtyDayLots: [
        {
          saleLotRef: "WRC-CROSS",
          saleDate: d(2024, 7, 3),
          sharesSold: 6,
          saleProceedsUsd: usd(900),
          essIncomeAud: aud(900),
          forexRate: 0.6620,
          forexDate: d(2024, 7, 3),
          financialYear: "2024-25",
        },
      ],
    });

    const result = service.aggregateByFy([release]);

    expect(result).toHaveLength(2);

    // FY 2023-24 should only contain the standard portion
    const fy2324 = result.find((r) => r.financialYear === "2023-24")!;
    expect(fy2324.totalEssIncomeAud).toBeCloseTo(600, 2);

    // FY 2024-25 should contain the 30-day lot income
    const fy2425 = result.find((r) => r.financialYear === "2024-25")!;
    expect(fy2425.totalEssIncomeAud).toBeCloseTo(900, 2);
  });

  it("Case 4: empty input — returns empty array", () => {
    const result = service.aggregateByFy([]);
    expect(result).toEqual([]);
  });

  it("Case 5: mixed FY with standard releases and cross-FY lots", () => {
    // Release A: entirely in FY 2023-24, standard only, 1000 AUD
    const releaseA = makeReleaseIncome({
      releaseRef: "R-A",
      financialYear: "2023-24",
      standardIncomeAud: aud(1000),
      totalEssIncomeAud: aud(1000),
    });

    // Release B: vest in FY 2023-24 (standard 400), 30-day lot in FY 2024-25 (500)
    const releaseB = makeReleaseIncome({
      releaseRef: "R-B",
      financialYear: "2023-24",
      standardIncomeAud: aud(400),
      totalEssIncomeAud: aud(900),
      thirtyDayLots: [
        {
          saleLotRef: "WRC-B",
          saleDate: d(2024, 7, 10),
          sharesSold: 5,
          saleProceedsUsd: usd(500),
          essIncomeAud: aud(500),
          forexRate: 0.65,
          forexDate: d(2024, 7, 10),
          financialYear: "2024-25",
        },
      ],
    });

    // Release C: entirely in FY 2024-25, standard only, 2000 AUD
    const releaseC = makeReleaseIncome({
      releaseRef: "R-C",
      financialYear: "2024-25",
      standardIncomeAud: aud(2000),
      totalEssIncomeAud: aud(2000),
    });

    const result = service.aggregateByFy([releaseA, releaseB, releaseC]);

    expect(result).toHaveLength(2);

    // FY 2023-24: A's 1000 + B's standard 400 = 1400
    const fy2324 = result.find((r) => r.financialYear === "2023-24")!;
    expect(fy2324.totalEssIncomeAud).toBeCloseTo(1400, 2);

    // FY 2024-25: C's 2000 + B's 30-day lot 500 = 2500
    const fy2425 = result.find((r) => r.financialYear === "2024-25")!;
    expect(fy2425.totalEssIncomeAud).toBeCloseTo(2500, 2);
  });
});
