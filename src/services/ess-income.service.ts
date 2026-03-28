import type { RsuRelease, SaleLot, AUD, USD } from "@/types";
import { usd, aud } from "@/types";
import type { ForexService } from "./forex.service";
import { getFinancialYear } from "@/lib/dates";
import { roundTo2dp, sumAud } from "@/lib/money";

// ── Result types (per spec) ─────────────────────────────────────────

export interface ThirtyDayLotIncome {
  saleLotRef: string;
  saleDate: Date;
  sharesSold: number;
  saleProceedsUsd: USD;
  essIncomeAud: AUD;
  forexRate: number;
  forexDate: Date;
  financialYear: string;
}

export interface ReleaseEssIncome {
  releaseRef: string;
  grantNumber: number;
  releaseDate: Date;
  sharesVested: number;
  fmvPerShare: USD;

  // Standard portion (not sold within 30 days)
  standardShares: number;
  standardIncomeUsd: USD;
  standardIncomeAud: AUD;
  standardForexRate: number;
  standardForexDate: Date;

  // 30-day rule portions
  thirtyDayLots: ThirtyDayLotIncome[];

  // Totals
  totalEssIncomeAud: AUD;
  financialYear: string;
}

export interface FyEssIncome {
  financialYear: string;
  releases: ReleaseEssIncome[];
  totalEssIncomeAud: AUD;
}

// ── Service interface ───────────────────────────────────────────────

export interface EssIncomeService {
  /** Calculate ESS income for each release, applying 30-day rule at per-lot granularity. */
  calculateByRelease(releases: RsuRelease[], saleLots: SaleLot[]): ReleaseEssIncome[];

  /** Group release ESS income results by financial year. */
  aggregateByFy(releaseIncomes: ReleaseEssIncome[]): FyEssIncome[];
}

// ── Helpers ─────────────────────────────────────────────────────────

function toFyString(date: Date): string {
  const fy = getFinancialYear(date);
  const startYear = fy - 1;
  const endYY = String(fy).slice(2);
  return `${startYear}-${endYY}`;
}

// ── Factory ─────────────────────────────────────────────────────────

export function createEssIncomeService(forex: ForexService): EssIncomeService {
  function calculateByRelease(releases: RsuRelease[], saleLots: SaleLot[]): ReleaseEssIncome[] {
    return releases.map((release) => {
      // Find 30-day sale lots for this release
      const thirtyDaySaleLots = saleLots.filter(
        (lot) => lot.originatingReleaseRef === release.releaseReferenceNumber && lot.soldWithin30Days
      );

      const thirtyDayShares = thirtyDaySaleLots.reduce((sum, lot) => sum + lot.sharesSold, 0);
      const standardShares = release.sharesVested - thirtyDayShares;

      // Standard portion: shares × FMV, converted at vest date
      const standardIncomeUsd = usd(roundTo2dp(standardShares * (release.fmvPerShare as number)));
      const vestForex = forex.usdToAud(standardIncomeUsd, release.releaseDate);

      // 30-day lots (not yet tested — stub empty for now)
      const thirtyDayLots: ThirtyDayLotIncome[] = [];

      const totalEssIncomeAud = sumAud([vestForex.aud, ...thirtyDayLots.map((l) => l.essIncomeAud)]);

      return {
        releaseRef: release.releaseReferenceNumber,
        grantNumber: release.grantNumber,
        releaseDate: release.releaseDate,
        sharesVested: release.sharesVested,
        fmvPerShare: release.fmvPerShare,
        standardShares,
        standardIncomeUsd,
        standardIncomeAud: vestForex.aud,
        standardForexRate: vestForex.rate,
        standardForexDate: vestForex.rateDate,
        thirtyDayLots,
        totalEssIncomeAud,
        financialYear: toFyString(release.releaseDate),
      };
    });
  }

  function aggregateByFy(releaseIncomes: ReleaseEssIncome[]): FyEssIncome[] {
    const byFy = new Map<string, ReleaseEssIncome[]>();
    for (const ri of releaseIncomes) {
      const existing = byFy.get(ri.financialYear) ?? [];
      existing.push(ri);
      byFy.set(ri.financialYear, existing);
    }

    return Array.from(byFy.entries()).map(([fy, releases]) => ({
      financialYear: fy,
      releases,
      totalEssIncomeAud: sumAud(releases.map((r) => r.totalEssIncomeAud)),
    }));
  }

  return { calculateByRelease, aggregateByFy };
}
