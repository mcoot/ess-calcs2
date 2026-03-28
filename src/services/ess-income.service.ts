import type { RsuRelease, SaleLot, AUD, USD } from "@/types";
import { usd, aud } from "@/types";
import type { ForexService } from "./forex.service";
import { toFyString } from "@/lib/dates";
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

      // 30-day lots: each lot's ESS income = sale proceeds converted at sale date
      const thirtyDayLots: ThirtyDayLotIncome[] = thirtyDaySaleLots.map((lot) => {
        const saleForex = forex.usdToAud(lot.saleProceeds, lot.saleDate);
        return {
          saleLotRef: lot.withdrawalReferenceNumber,
          saleDate: lot.saleDate,
          sharesSold: lot.sharesSold,
          saleProceedsUsd: lot.saleProceeds,
          essIncomeAud: saleForex.aud,
          forexRate: saleForex.rate,
          forexDate: saleForex.rateDate,
          financialYear: toFyString(lot.saleDate),
        };
      });

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
    // Build a map of FY → { releases, total AUD }
    // Standard income goes to the release's vest-date FY.
    // Each 30-day lot's income goes to the lot's sale-date FY.
    const fyTotals = new Map<string, AUD>();
    const fyReleases = new Map<string, ReleaseEssIncome[]>();

    function addToFy(fy: string, amount: AUD, release: ReleaseEssIncome) {
      fyTotals.set(fy, aud((fyTotals.get(fy) ?? 0) + (amount as number)));
      const existing = fyReleases.get(fy) ?? [];
      if (!existing.includes(release)) {
        existing.push(release);
      }
      fyReleases.set(fy, existing);
    }

    for (const ri of releaseIncomes) {
      // Standard portion → vest-date FY
      if ((ri.standardIncomeAud as number) !== 0) {
        addToFy(ri.financialYear, ri.standardIncomeAud, ri);
      }

      // 30-day lots → each lot's sale-date FY
      for (const lot of ri.thirtyDayLots) {
        addToFy(lot.financialYear, lot.essIncomeAud, ri);
      }

      // If release has no income at all, still group it under its FY
      if ((ri.standardIncomeAud as number) === 0 && ri.thirtyDayLots.length === 0) {
        addToFy(ri.financialYear, aud(0), ri);
      }
    }

    return Array.from(fyTotals.entries()).map(([fy, total]) => ({
      financialYear: fy,
      releases: fyReleases.get(fy) ?? [],
      totalEssIncomeAud: aud(roundTo2dp(total as number)),
    }));
  }

  return { calculateByRelease, aggregateByFy };
}
