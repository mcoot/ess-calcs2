import type { RsuRelease, SaleLot, AUD, USD } from "@/types";
import { aud } from "@/types";
import type { EssIncomeService, ReleaseEssIncome } from "./ess-income.service";
import type { CgtService, FyCgtSummary, SaleLotCgt } from "./cgt.service";
import { toFyString, daysBetween } from "@/lib/dates";
import { roundTo2dp } from "@/lib/money";

// ── Report row types ────────────────────────────────────────────────

export interface EssIncomeReportRow {
  date: Date;
  grantNumber: number;
  grantName: string;
  releaseRef: string;
  shares: number;
  fmvPerShareUsd: USD;
  grossValueUsd: USD;
  exchangeRate: number;
  rateDate: Date;
  essIncomeAud: AUD;
  is30DayRule: boolean;
  notes: string;
}

export interface CgtReportRow {
  saleDate: Date;
  acquisitionDate: Date;
  grantNumber: number;
  grantName: string;
  lotNumber: number;
  sharesSold: number;
  holdingDays: number;
  discountEligible: boolean;
  costBasisUsd: USD;
  costBasisAud: AUD;
  costBasisRate: number;
  costBasisRateDate: Date;
  netProceedsUsd: USD;
  netProceedsAud: AUD;
  proceedsRate: number;
  proceedsRateDate: Date;
  capitalGainLossAud: AUD;
}

export interface ThirtyDaySummaryRow {
  saleDate: Date;
  vestDate: Date;
  daysHeld: number;
  grantNumber: number;
  grantName: string;
  shares: number;
  saleProceedsUsd: USD;
  essIncomeAud: AUD;
}

export interface FyTaxReport {
  financialYear: string;
  essIncomeRows: EssIncomeReportRow[];
  essIncomeTotalAud: AUD;
  cgtRows: CgtReportRow[];
  cgtSummary: FyCgtSummary;
  thirtyDaySummaryRows: ThirtyDaySummaryRow[];
}

// ── Service interface ───────────────────────────────────────────────

export interface ReportService {
  generateFyReport(
    fy: string,
    releases: RsuRelease[],
    saleLots: SaleLot[],
    essIncomeService: EssIncomeService,
    cgtService: CgtService,
  ): FyTaxReport;

  availableFinancialYears(
    releases: RsuRelease[],
    saleLots: SaleLot[],
  ): string[];
}

// ── Factory ─────────────────────────────────────────────────────────

function emptyCgtSummary(fy: string): FyCgtSummary {
  return {
    financialYear: fy,
    lots: [],
    shortTermGains: aud(0),
    longTermGains: aud(0),
    totalGains: aud(0),
    shortTermLosses: aud(0),
    longTermLosses: aud(0),
    totalLosses: aud(0),
    shortTermAfterLosses: aud(0),
    longTermAfterLosses: aud(0),
    discountAmount: aud(0),
    discountedLongTerm: aud(0),
    netCapitalGain: aud(0),
    netCapitalLoss: aud(0),
  };
}

export function createReportService(): ReportService {
  function buildGrantNameLookup(releases: RsuRelease[], saleLots: SaleLot[]): Map<number, string> {
    const lookup = new Map<number, string>();
    for (const r of releases) {
      lookup.set(r.grantNumber, r.grantName);
    }
    for (const lot of saleLots) {
      if (!lookup.has(lot.grantNumber)) {
        lookup.set(lot.grantNumber, lot.grantName);
      }
    }
    return lookup;
  }

  function buildEssRows(
    fyReleases: ReleaseEssIncome[],
    grantNames: Map<number, string>,
  ): EssIncomeReportRow[] {
    const rows: EssIncomeReportRow[] = [];

    for (const ri of fyReleases) {
      const grantName = grantNames.get(ri.grantNumber) ?? "";

      if (ri.standardShares > 0) {
        rows.push({
          date: ri.releaseDate,
          grantNumber: ri.grantNumber,
          grantName,
          releaseRef: ri.releaseRef,
          shares: ri.standardShares,
          fmvPerShareUsd: ri.fmvPerShare,
          grossValueUsd: ri.standardIncomeUsd,
          exchangeRate: ri.standardForexRate,
          rateDate: ri.standardForexDate,
          essIncomeAud: ri.standardIncomeAud,
          is30DayRule: false,
          notes: "",
        });
      }

      for (const lot of ri.thirtyDayLots) {
        const daysHeld = daysBetween(ri.releaseDate, lot.saleDate);
        rows.push({
          date: lot.saleDate,
          grantNumber: ri.grantNumber,
          grantName,
          releaseRef: ri.releaseRef,
          shares: lot.sharesSold,
          fmvPerShareUsd: ri.fmvPerShare,
          grossValueUsd: lot.saleProceedsUsd,
          exchangeRate: lot.forexRate,
          rateDate: lot.forexDate,
          essIncomeAud: lot.essIncomeAud,
          is30DayRule: true,
          notes: `Sold ${daysHeld} days after vest`,
        });
      }
    }

    return rows;
  }

  function buildCgtRows(
    fyLots: SaleLotCgt[],
    grantNames: Map<number, string>,
  ): CgtReportRow[] {
    return fyLots.map((lot) => ({
      saleDate: lot.saleDate,
      acquisitionDate: lot.acquisitionDate,
      grantNumber: lot.grantNumber,
      grantName: grantNames.get(lot.grantNumber) ?? "",
      lotNumber: lot.lotNumber,
      sharesSold: lot.sharesSold,
      holdingDays: lot.holdingDays,
      discountEligible: lot.isDiscountEligible,
      costBasisUsd: lot.costBasisUsd,
      costBasisAud: lot.costBasisAud,
      costBasisRate: lot.acquisitionForexRate,
      costBasisRateDate: lot.acquisitionForexDate,
      netProceedsUsd: lot.netProceedsUsd,
      netProceedsAud: lot.netProceedsAud,
      proceedsRate: lot.saleForexRate,
      proceedsRateDate: lot.saleForexDate,
      capitalGainLossAud: lot.capitalGainLossAud,
    }));
  }

  function buildThirtyDaySummary(
    fyReleases: ReleaseEssIncome[],
    grantNames: Map<number, string>,
  ): ThirtyDaySummaryRow[] {
    const rows: ThirtyDaySummaryRow[] = [];

    for (const ri of fyReleases) {
      for (const lot of ri.thirtyDayLots) {
        const daysHeld = daysBetween(ri.releaseDate, lot.saleDate);
        rows.push({
          saleDate: lot.saleDate,
          vestDate: ri.releaseDate,
          daysHeld,
          grantNumber: ri.grantNumber,
          grantName: grantNames.get(ri.grantNumber) ?? "",
          shares: lot.sharesSold,
          saleProceedsUsd: lot.saleProceedsUsd,
          essIncomeAud: lot.essIncomeAud,
        });
      }
    }

    return rows;
  }

  function generateFyReport(
    fy: string,
    releases: RsuRelease[],
    saleLots: SaleLot[],
    essIncomeService: EssIncomeService,
    cgtService: CgtService,
  ): FyTaxReport {
    const grantNames = buildGrantNameLookup(releases, saleLots);

    const allReleaseIncomes = essIncomeService.calculateByRelease(releases, saleLots);
    const fyEssIncomes = essIncomeService.aggregateByFy(allReleaseIncomes);
    const fyEss = fyEssIncomes.find((e) => e.financialYear === fy);

    const essIncomeRows = fyEss ? buildEssRows(fyEss.releases, grantNames) : [];
    const essIncomeTotalAud = fyEss
      ? aud(roundTo2dp(fyEss.totalEssIncomeAud as number))
      : aud(0);

    const allLotCgts = cgtService.calculateByLot(saleLots);
    const fyCgtSummaries = cgtService.aggregateByFy(allLotCgts);
    const fyCgt = fyCgtSummaries.find((c) => c.financialYear === fy);

    const cgtRows = fyCgt ? buildCgtRows(fyCgt.lots, grantNames) : [];
    const cgtSummary = fyCgt ?? emptyCgtSummary(fy);

    const thirtyDaySummaryRows = fyEss
      ? buildThirtyDaySummary(fyEss.releases, grantNames)
      : [];

    return {
      financialYear: fy,
      essIncomeRows,
      essIncomeTotalAud,
      cgtRows,
      cgtSummary,
      thirtyDaySummaryRows,
    };
  }

  function availableFinancialYears(
    releases: RsuRelease[],
    saleLots: SaleLot[],
  ): string[] {
    const fys = new Set<string>();
    for (const r of releases) {
      fys.add(toFyString(r.releaseDate));
    }
    for (const lot of saleLots) {
      fys.add(toFyString(lot.saleDate));
    }
    return Array.from(fys).sort();
  }

  return { generateFyReport, availableFinancialYears };
}
