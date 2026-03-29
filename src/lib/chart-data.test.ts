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
    totalEssIncomeUsd: overrides.totalEssIncomeUsd ?? usd(overrides.sharesVested * 150),
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
    shortTermGainsUsd: overrides.shortTermGainsUsd ?? usd(0),
    longTermGainsUsd: overrides.longTermGainsUsd ?? usd(0),
    shortTermLossesUsd: overrides.shortTermLossesUsd ?? usd(0),
    longTermLossesUsd: overrides.longTermLossesUsd ?? usd(0),
    totalGainsUsd: overrides.totalGainsUsd ?? usd(0),
    totalLossesUsd: overrides.totalLossesUsd ?? usd(0),
    totalGainLossUsd: overrides.totalGainLossUsd ?? usd(0),
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
    expect(toEssIncomeByFyBars([], "AUD")).toEqual([]);
  });

  it("splits standard vs 30-day income per FY (AUD)", () => {
    const fyIncomes: FyEssIncome[] = [
      {
        financialYear: "2022-23",
        totalEssIncomeAud: aud(10000),
        totalEssIncomeUsd: usd(7500),
        releases: [
          makeReleaseIncome({
            releaseDate: d(2023, 1, 15),
            sharesVested: 30,
            standardIncomeUsd: usd(4500),
            standardIncomeAud: aud(6000),
            totalEssIncomeAud: aud(10000),
            totalEssIncomeUsd: usd(6000),
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

    const result = toEssIncomeByFyBars(fyIncomes, "AUD");

    expect(result).toEqual([
      { fy: "2022-23", standard: 6000, thirtyDay: 4000 },
    ]);
  });

  it("splits standard vs 30-day income per FY (USD)", () => {
    const fyIncomes: FyEssIncome[] = [
      {
        financialYear: "2022-23",
        totalEssIncomeAud: aud(10000),
        totalEssIncomeUsd: usd(6000),
        releases: [
          makeReleaseIncome({
            releaseDate: d(2023, 1, 15),
            sharesVested: 30,
            standardIncomeUsd: usd(4500),
            standardIncomeAud: aud(6000),
            totalEssIncomeAud: aud(10000),
            totalEssIncomeUsd: usd(6000),
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

    const result = toEssIncomeByFyBars(fyIncomes, "USD");

    // USD: standard=4500, thirtyDay=1500
    expect(result).toEqual([
      { fy: "2022-23", standard: 4500, thirtyDay: 1500 },
    ]);
  });
});

// ── toCgtByFyBars ───────────────────────────────────────────────────

describe("toCgtByFyBars", () => {
  it("returns empty array for empty input", () => {
    expect(toCgtByFyBars([], "AUD")).toEqual([]);
  });

  it("maps CGT summary fields correctly (AUD)", () => {
    const summaries = [
      makeFyCgtSummary({
        financialYear: "2022-23",
        shortTermGains: aud(1000),
        longTermGains: aud(5000),
        totalLosses: aud(800),
        netCapitalGain: aud(4700),
      }),
    ];

    const result = toCgtByFyBars(summaries, "AUD");

    expect(result).toEqual([
      { fy: "2022-23", shortTermGains: 1000, longTermGains: 5000, losses: -800, netGain: 4700 },
    ]);
  });

  it("maps USD summary fields (no discount/offset)", () => {
    const summaries = [
      makeFyCgtSummary({
        financialYear: "2022-23",
        shortTermGains: aud(1000),
        longTermGains: aud(5000),
        totalLosses: aud(800),
        netCapitalGain: aud(4700),
        shortTermGainsUsd: usd(700),
        longTermGainsUsd: usd(3500),
        totalLossesUsd: usd(600),
        totalGainLossUsd: usd(3600),
      }),
    ];

    const result = toCgtByFyBars(summaries, "USD");

    expect(result).toEqual([
      { fy: "2022-23", shortTermGains: 700, longTermGains: 3500, losses: -600, netGain: 3600 },
    ]);
  });
});

// ── toCumulativeEssIncome ───────────────────────────────────────────

describe("toCumulativeEssIncome", () => {
  it("returns empty array for empty input", () => {
    expect(toCumulativeEssIncome([], "AUD")).toEqual([]);
  });

  it("accumulates income sorted by release date (AUD)", () => {
    const releases = [
      makeReleaseIncome({
        releaseDate: d(2023, 6, 1),
        sharesVested: 10,
        totalEssIncomeAud: aud(3000),
        totalEssIncomeUsd: usd(2000),
        financialYear: "2022-23",
      }),
      makeReleaseIncome({
        releaseDate: d(2023, 1, 1),
        sharesVested: 20,
        totalEssIncomeAud: aud(5000),
        totalEssIncomeUsd: usd(3500),
        financialYear: "2022-23",
      }),
      makeReleaseIncome({
        releaseDate: d(2023, 9, 1),
        sharesVested: 15,
        totalEssIncomeAud: aud(4000),
        totalEssIncomeUsd: usd(2800),
        financialYear: "2023-24",
      }),
    ];

    const result = toCumulativeEssIncome(releases, "AUD");

    expect(result).toEqual([
      { date: "2023-01-01", cumulative: 5000 },
      { date: "2023-06-01", cumulative: 8000 },
      { date: "2023-09-01", cumulative: 12000 },
    ]);
  });

  it("accumulates USD income when currency is USD", () => {
    const releases = [
      makeReleaseIncome({
        releaseDate: d(2023, 1, 1),
        sharesVested: 20,
        totalEssIncomeAud: aud(5000),
        totalEssIncomeUsd: usd(3500),
        financialYear: "2022-23",
      }),
      makeReleaseIncome({
        releaseDate: d(2023, 6, 1),
        sharesVested: 10,
        totalEssIncomeAud: aud(3000),
        totalEssIncomeUsd: usd(2000),
        financialYear: "2022-23",
      }),
    ];

    const result = toCumulativeEssIncome(releases, "USD");

    expect(result).toEqual([
      { date: "2023-01-01", cumulative: 3500 },
      { date: "2023-06-01", cumulative: 5500 },
    ]);
  });
});
