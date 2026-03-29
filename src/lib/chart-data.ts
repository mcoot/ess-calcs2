import type { ReleaseEssIncome, FyEssIncome } from "@/services/ess-income.service";
import type { FyCgtSummary } from "@/services/cgt.service";
import { toDateKey } from "./dates";
import { sumAud, sumUsd } from "./money";

// ── Chart data shapes ───────────────────────────────────────────────

export interface VestValueBar {
  date: string;
  value: number;
  grant: string;
}

export interface SharePricePoint {
  date: string;
  fmvPerShare: number;
  grantNumber: number;
}

export interface EssIncomeFyBar {
  fy: string;
  standard: number;
  thirtyDay: number;
}

export interface CgtFyBar {
  fy: string;
  shortTermGains: number;
  longTermGains: number;
  losses: number;
  netGain: number;
}

export interface CumulativeEssPoint {
  date: string;
  cumulative: number;
}

// ── Transformers ────────────────────────────────────────────────────

function sortedByDate(releases: ReleaseEssIncome[]): ReleaseEssIncome[] {
  return [...releases].sort(
    (a, b) => a.releaseDate.getTime() - b.releaseDate.getTime(),
  );
}

export function toVestValueBars(
  releaseIncomes: ReleaseEssIncome[],
  currency: "USD" | "AUD",
): VestValueBar[] {
  return sortedByDate(releaseIncomes).map((r) => ({
    date: toDateKey(r.releaseDate),
    value:
      currency === "AUD"
        ? (r.totalEssIncomeAud as number)
        : r.sharesVested * (r.fmvPerShare as number),
    grant: String(r.grantNumber),
  }));
}

export function toSharePriceLine(
  releaseIncomes: ReleaseEssIncome[],
): SharePricePoint[] {
  return sortedByDate(releaseIncomes).map((r) => ({
    date: toDateKey(r.releaseDate),
    fmvPerShare: r.fmvPerShare as number,
    grantNumber: r.grantNumber,
  }));
}

export function toEssIncomeByFyBars(
  fyEssIncomes: FyEssIncome[],
  currency: "USD" | "AUD",
): EssIncomeFyBar[] {
  return fyEssIncomes.map((fy) => {
    if (currency === "USD") {
      const standard = sumUsd(fy.releases.map((r) => r.standardIncomeUsd));
      const thirtyDay = sumUsd(
        fy.releases.flatMap((r) => r.thirtyDayLots.map((l) => l.saleProceedsUsd)),
      );
      return {
        fy: fy.financialYear,
        standard: standard as number,
        thirtyDay: thirtyDay as number,
      };
    }
    const standard = sumAud(fy.releases.map((r) => r.standardIncomeAud));
    const thirtyDay = sumAud(
      fy.releases.flatMap((r) => r.thirtyDayLots.map((l) => l.essIncomeAud)),
    );
    return {
      fy: fy.financialYear,
      standard: standard as number,
      thirtyDay: thirtyDay as number,
    };
  });
}

export function toCgtByFyBars(
  fyCgtSummaries: FyCgtSummary[],
  currency: "USD" | "AUD",
): CgtFyBar[] {
  return fyCgtSummaries.map((s) => {
    if (currency === "USD") {
      return {
        fy: s.financialYear,
        shortTermGains: s.shortTermGainsUsd as number,
        longTermGains: s.longTermGainsUsd as number,
        losses: -(s.totalLossesUsd as number),
        netGain: s.totalGainLossUsd as number,
      };
    }
    return {
      fy: s.financialYear,
      shortTermGains: s.shortTermGains as number,
      longTermGains: s.longTermGains as number,
      losses: -(s.totalLosses as number),
      netGain: s.netCapitalGain as number,
    };
  });
}

export function toCumulativeEssIncome(
  releaseIncomes: ReleaseEssIncome[],
  currency: "USD" | "AUD",
): CumulativeEssPoint[] {
  const sorted = sortedByDate(releaseIncomes);
  let cumulative = 0;
  return sorted.map((r) => {
    cumulative += currency === "USD"
      ? (r.totalEssIncomeUsd as number)
      : (r.totalEssIncomeAud as number);
    return { date: toDateKey(r.releaseDate), cumulative };
  });
}
