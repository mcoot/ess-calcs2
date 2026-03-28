import type { Award, AUD, SaleLot } from "@/types";
import { aud } from "@/types";
import type { ReleaseEssIncome } from "./ess-income.service";
import type { FyCgtSummary } from "./cgt.service";
import { sumAud } from "@/lib/money";
import { toFyString } from "@/lib/dates";

// ── Result types ────────────────────────────────────────────────────

export interface DashboardSummary {
  totalEssIncomeAud: AUD;
  netCapitalGainsAud: AUD;
  totalCapitalLossesAud: AUD;
  awardsCount: number;
  totalSharesVested: number;
  totalSharesSold: number;
  availableFinancialYears: string[];
}

// ── Service interface ───────────────────────────────────────────────

export interface DashboardService {
  summarize(
    awards: Award[],
    releaseIncomes: ReleaseEssIncome[],
    fyCgtSummaries: FyCgtSummary[],
    saleLots: SaleLot[],
    fyFilter?: string,
  ): DashboardSummary;
}

// ── Factory ─────────────────────────────────────────────────────────

export function createDashboardService(): DashboardService {
  function summarize(
    awards: Award[],
    releaseIncomes: ReleaseEssIncome[],
    fyCgtSummaries: FyCgtSummary[],
    saleLots: SaleLot[],
    fyFilter?: string,
  ): DashboardSummary {
    // Collect all available FYs (always unfiltered)
    const fySet = new Set<string>();
    for (const r of releaseIncomes) fySet.add(r.financialYear);
    for (const c of fyCgtSummaries) fySet.add(c.financialYear);
    const availableFinancialYears = [...fySet].sort();

    // Apply FY filter to data subsets
    const shouldFilter = fyFilter !== undefined && fyFilter !== "all";
    const filteredReleases = shouldFilter
      ? releaseIncomes.filter((r) => r.financialYear === fyFilter)
      : releaseIncomes;
    const filteredCgt = shouldFilter
      ? fyCgtSummaries.filter((c) => c.financialYear === fyFilter)
      : fyCgtSummaries;
    const filteredLots = shouldFilter
      ? saleLots.filter((l) => toFyString(l.saleDate) === fyFilter)
      : saleLots;

    return {
      totalEssIncomeAud: sumAud(filteredReleases.map((r) => r.totalEssIncomeAud)),
      netCapitalGainsAud: sumAud(filteredCgt.map((c) => c.netCapitalGain)),
      totalCapitalLossesAud: sumAud(filteredCgt.map((c) => c.netCapitalLoss)),
      awardsCount: awards.length,
      totalSharesVested: filteredReleases.reduce((sum, r) => sum + r.sharesVested, 0),
      totalSharesSold: filteredLots.reduce((sum, l) => sum + l.sharesSold, 0),
      availableFinancialYears,
    };
  }

  return { summarize };
}
