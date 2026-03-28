import { describe, it, expect } from "vitest";
import {
  toVestValueBars,
  toSharePriceLine,
  toEssIncomeByFyBars,
  toCgtByFyBars,
  toCumulativeEssIncome,
} from "./chart-data";
import type { ReleaseEssIncome, FyEssIncome } from "@/services/ess-income.service";
import type { FyCgtSummary } from "@/services/cgt.service";
import { aud, usd } from "@/types";
import { d } from "@/test-helpers";

// ── Helpers ─────────────────────────────────────────────────────────

function makeReleaseIncome(
  overrides: Partial<ReleaseEssIncome> &
    Pick<ReleaseEssIncome, "releaseDate" | "sharesVested" | "totalEssIncomeAud" | "financialYear">,
): ReleaseEssIncome {
  return {
    releaseRef: overrides.releaseRef ?? "RB-TEST",
    grantNumber: overrides.grantNumber ?? 9375,
    releaseDate: overrides.releaseDate,
    sharesVested: overrides.sharesVested,
    fmvPerShare: overrides.fmvPerShare ?? usd(150),
    standardShares: overrides.standardShares ?? overrides.sharesVested,
    standardIncomeUsd: overrides.standardIncomeUsd ?? usd(overrides.sharesVested * 150),
    standardIncomeAud: overrides.standardIncomeAud ?? overrides.totalEssIncomeAud,
    standardForexRate: overrides.standardForexRate ?? 0.75,
    standardForexDate: overrides.standardForexDate ?? overrides.releaseDate,
    thirtyDayLots: overrides.thirtyDayLots ?? [],
    totalEssIncomeAud: overrides.totalEssIncomeAud,
    financialYear: overrides.financialYear,
  };
}

function makeFyCgtSummary(
  overrides: Partial<FyCgtSummary> &
    Pick<FyCgtSummary, "financialYear">,
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
    netCapitalGain: overrides.netCapitalGain ?? aud(0),
    netCapitalLoss: overrides.netCapitalLoss ?? aud(0),
  };
}

// ── toVestValueBars ─────────────────────────────────────────────────

describe("toVestValueBars", () => {
  it("returns empty array for empty input", () => {
    expect(toVestValueBars([], "AUD")).toEqual([]);
  });

  it("maps releases to bars sorted by date", () => {
    const releases = [
      makeReleaseIncome({
        releaseDate: d(2023, 3, 15),
        sharesVested: 30,
        fmvPerShare: usd(150),
        totalEssIncomeAud: aud(6000),
        financialYear: "2022-23",
        grantNumber: 9375,
      }),
      makeReleaseIncome({
        releaseDate: d(2023, 1, 10),
        sharesVested: 20,
        fmvPerShare: usd(160),
        totalEssIncomeAud: aud(4267),
        financialYear: "2022-23",
        grantNumber: 14333,
      }),
    ];

    const result = toVestValueBars(releases, "AUD");

    expect(result).toHaveLength(2);
    // Sorted by date — Jan before Mar
    expect(result[0].date).toBe("2023-01-10");
    expect(result[0].grant).toBe("14333");
    expect(result[0].value).toBe(4267); // AUD mode uses totalEssIncomeAud
    expect(result[1].date).toBe("2023-03-15");
    expect(result[1].grant).toBe("9375");
    expect(result[1].value).toBe(6000);
  });

  it("uses USD value (shares × FMV) in USD mode", () => {
    const releases = [
      makeReleaseIncome({
        releaseDate: d(2023, 1, 10),
        sharesVested: 20,
        fmvPerShare: usd(160),
        totalEssIncomeAud: aud(4267),
        financialYear: "2022-23",
      }),
    ];

    const result = toVestValueBars(releases, "USD");

    expect(result[0].value).toBe(3200); // 20 × 160
  });
});

// ── toSharePriceLine ────────────────────────────────────────────────

describe("toSharePriceLine", () => {
  it("returns empty array for empty input", () => {
    expect(toSharePriceLine([])).toEqual([]);
  });

  it("maps releases to price points sorted by date", () => {
    const releases = [
      makeReleaseIncome({
        releaseDate: d(2023, 6, 1),
        sharesVested: 10,
        fmvPerShare: usd(170),
        totalEssIncomeAud: aud(2500),
        financialYear: "2022-23",
        grantNumber: 9375,
      }),
      makeReleaseIncome({
        releaseDate: d(2023, 2, 1),
        sharesVested: 10,
        fmvPerShare: usd(155),
        totalEssIncomeAud: aud(2000),
        financialYear: "2022-23",
        grantNumber: 14333,
      }),
    ];

    const result = toSharePriceLine(releases);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: "2023-02-01", fmvPerShare: 155, grantNumber: 14333 });
    expect(result[1]).toEqual({ date: "2023-06-01", fmvPerShare: 170, grantNumber: 9375 });
  });
});

// ── toEssIncomeByFyBars ─────────────────────────────────────────────

describe("toEssIncomeByFyBars", () => {
  it("returns empty array for empty input", () => {
    expect(toEssIncomeByFyBars([])).toEqual([]);
  });

  it("splits standard vs 30-day income per FY", () => {
    const fyIncomes: FyEssIncome[] = [
      {
        financialYear: "2022-23",
        totalEssIncomeAud: aud(10000),
        releases: [
          makeReleaseIncome({
            releaseDate: d(2023, 1, 15),
            sharesVested: 30,
            standardIncomeAud: aud(6000),
            totalEssIncomeAud: aud(10000),
            financialYear: "2022-23",
            thirtyDayLots: [
              {
                saleLotRef: "WRC-1",
                saleDate: d(2023, 2, 1),
                sharesSold: 10,
                saleProceedsUsd: usd(1500),
                essIncomeAud: aud(4000),
                forexRate: 0.75,
                forexDate: d(2023, 2, 1),
                financialYear: "2022-23",
              },
            ],
          }),
        ],
      },
    ];

    const result = toEssIncomeByFyBars(fyIncomes);

    expect(result).toEqual([
      { fy: "2022-23", standard: 6000, thirtyDay: 4000 },
    ]);
  });
});

// ── toCgtByFyBars ───────────────────────────────────────────────────

describe("toCgtByFyBars", () => {
  it("returns empty array for empty input", () => {
    expect(toCgtByFyBars([])).toEqual([]);
  });

  it("maps CGT summary fields correctly", () => {
    const summaries = [
      makeFyCgtSummary({
        financialYear: "2022-23",
        shortTermGains: aud(1000),
        longTermGains: aud(5000),
        totalLosses: aud(800),
        netCapitalGain: aud(4700),
      }),
      makeFyCgtSummary({
        financialYear: "2023-24",
        shortTermGains: aud(0),
        longTermGains: aud(2000),
        totalLosses: aud(500),
        netCapitalGain: aud(1500),
      }),
    ];

    const result = toCgtByFyBars(summaries);

    expect(result).toEqual([
      { fy: "2022-23", shortTermGains: 1000, longTermGains: 5000, losses: -800, netGain: 4700 },
      { fy: "2023-24", shortTermGains: 0, longTermGains: 2000, losses: -500, netGain: 1500 },
    ]);
  });
});

// ── toCumulativeEssIncome ───────────────────────────────────────────

describe("toCumulativeEssIncome", () => {
  it("returns empty array for empty input", () => {
    expect(toCumulativeEssIncome([])).toEqual([]);
  });

  it("accumulates income sorted by release date", () => {
    const releases = [
      makeReleaseIncome({
        releaseDate: d(2023, 6, 1),
        sharesVested: 10,
        totalEssIncomeAud: aud(3000),
        financialYear: "2022-23",
      }),
      makeReleaseIncome({
        releaseDate: d(2023, 1, 1),
        sharesVested: 20,
        totalEssIncomeAud: aud(5000),
        financialYear: "2022-23",
      }),
      makeReleaseIncome({
        releaseDate: d(2023, 9, 1),
        sharesVested: 15,
        totalEssIncomeAud: aud(4000),
        financialYear: "2023-24",
      }),
    ];

    const result = toCumulativeEssIncome(releases);

    expect(result).toEqual([
      { date: "2023-01-01", cumulative: 5000 },
      { date: "2023-06-01", cumulative: 8000 },
      { date: "2023-09-01", cumulative: 12000 },
    ]);
  });
});
