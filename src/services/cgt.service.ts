import type { SaleLot, AUD, USD } from "@/types";
import { usd, aud } from "@/types";
import type { ForexService } from "./forex.service";
import { toFyString } from "@/lib/dates";
import { roundTo2dp, subtractUsd } from "@/lib/money";

// ── Result types (per spec) ─────────────────────────────────────────

export interface SaleLotCgt {
  // Source data
  withdrawalRef: string;
  originatingReleaseRef: string;
  grantNumber: number;
  lotNumber: number;
  saleDate: Date;
  acquisitionDate: Date;

  // USD amounts
  costBasisUsd: USD;
  grossProceedsUsd: USD;
  brokerageUsd: USD;
  feesUsd: USD;
  netProceedsUsd: USD;
  sharesSold: number;

  // AUD conversion
  acquisitionForexRate: number;
  acquisitionForexDate: Date;
  saleForexRate: number;
  saleForexDate: Date;

  // AUD amounts
  costBasisAud: AUD;
  netProceedsAud: AUD;
  capitalGainLossAud: AUD;

  // USD gain/loss (raw, no ATO discount/offset)
  capitalGainLossUsd: USD;

  // Discount eligibility
  holdingDays: number;
  isLongTerm: boolean;
  isDiscountEligible: boolean;

  // Financial year
  financialYear: string;
}

export interface FyCgtSummary {
  financialYear: string;
  lots: SaleLotCgt[];

  // Categorized gains
  shortTermGains: AUD;
  longTermGains: AUD;
  totalGains: AUD;

  // Losses
  shortTermLosses: AUD;
  longTermLosses: AUD;
  totalLosses: AUD;

  // After loss offsetting
  shortTermAfterLosses: AUD;
  longTermAfterLosses: AUD;

  // After discount
  discountAmount: AUD;
  discountedLongTerm: AUD;

  // Final
  netCapitalGain: AUD;
  netCapitalLoss: AUD;

  // USD raw sums (no ATO discount/offset)
  shortTermGainsUsd: USD;
  longTermGainsUsd: USD;
  shortTermLossesUsd: USD;
  longTermLossesUsd: USD;
  totalGainsUsd: USD;
  totalLossesUsd: USD;
  totalGainLossUsd: USD;
}

// ── Service interface ───────────────────────────────────────────────

export interface CgtService {
  /** Calculate CGT for each qualifying sale lot (excludes 30-day lots). */
  calculateByLot(lots: SaleLot[]): SaleLotCgt[];

  /** Aggregate per-lot CGT results by FY with loss offsetting and discount. */
  aggregateByFy(lotResults: SaleLotCgt[]): FyCgtSummary[];
}

// ── Factory ─────────────────────────────────────────────────────────

const MILLIS_PER_DAY = 86_400_000;

export function createCgtService(forex: ForexService): CgtService {
  function calculateByLot(lots: SaleLot[]): SaleLotCgt[] {
    return lots
      .filter((lot) => !lot.soldWithin30Days)
      .map((lot) => {
        // USD amounts
        const netProceedsUsd = usd(
          roundTo2dp(
            (lot.saleProceeds as number) -
            (lot.brokerageCommission as number) -
            (lot.supplementalTransactionFee as number)
          )
        );

        // AUD conversion at two different dates
        const acqForex = forex.usdToAud(lot.costBasis, lot.originalAcquisitionDate);
        const saleForex = forex.usdToAud(netProceedsUsd, lot.saleDate);

        // Capital gain/loss
        const capitalGainLossAud = aud(
          roundTo2dp((saleForex.aud as number) - (acqForex.aud as number))
        );
        const capitalGainLossUsd = subtractUsd(netProceedsUsd, lot.costBasis);

        // Holding period and discount
        const holdingDays = Math.round(
          (lot.saleDate.getTime() - lot.originalAcquisitionDate.getTime()) / MILLIS_PER_DAY
        );
        const isLongTerm = holdingDays > 365;
        const isDiscountEligible = isLongTerm && (capitalGainLossAud as number) > 0;

        return {
          withdrawalRef: lot.withdrawalReferenceNumber,
          originatingReleaseRef: lot.originatingReleaseRef,
          grantNumber: lot.grantNumber,
          lotNumber: lot.lotNumber,
          saleDate: lot.saleDate,
          acquisitionDate: lot.originalAcquisitionDate,
          costBasisUsd: lot.costBasis,
          grossProceedsUsd: lot.saleProceeds,
          brokerageUsd: lot.brokerageCommission,
          feesUsd: lot.supplementalTransactionFee,
          netProceedsUsd,
          sharesSold: lot.sharesSold,
          acquisitionForexRate: acqForex.rate,
          acquisitionForexDate: acqForex.rateDate,
          saleForexRate: saleForex.rate,
          saleForexDate: saleForex.rateDate,
          costBasisAud: acqForex.aud,
          netProceedsAud: saleForex.aud,
          capitalGainLossAud,
          capitalGainLossUsd,
          holdingDays,
          isLongTerm,
          isDiscountEligible,
          financialYear: toFyString(lot.saleDate),
        };
      });
  }

  function aggregateByFy(lotResults: SaleLotCgt[]): FyCgtSummary[] {
    // Group lots by FY
    const byFy = new Map<string, SaleLotCgt[]>();
    for (const lot of lotResults) {
      const existing = byFy.get(lot.financialYear) ?? [];
      existing.push(lot);
      byFy.set(lot.financialYear, existing);
    }

    return Array.from(byFy.entries()).map(([fy, lots]) => {
      // Categorize gains and losses
      let shortTermGains = 0;
      let longTermGains = 0;
      let shortTermLosses = 0;
      let longTermLosses = 0;

      // USD raw sums (no discount/offset)
      let shortTermGainsUsdSum = 0;
      let longTermGainsUsdSum = 0;
      let shortTermLossesUsdSum = 0;
      let longTermLossesUsdSum = 0;

      for (const lot of lots) {
        const gain = lot.capitalGainLossAud as number;
        const gainUsd = lot.capitalGainLossUsd as number;
        if (gain >= 0) {
          if (lot.isLongTerm) {
            longTermGains += gain;
          } else {
            shortTermGains += gain;
          }
        } else {
          if (lot.isLongTerm) {
            longTermLosses += Math.abs(gain);
          } else {
            shortTermLosses += Math.abs(gain);
          }
        }
        if (gainUsd >= 0) {
          if (lot.isLongTerm) {
            longTermGainsUsdSum += gainUsd;
          } else {
            shortTermGainsUsdSum += gainUsd;
          }
        } else {
          if (lot.isLongTerm) {
            longTermLossesUsdSum += Math.abs(gainUsd);
          } else {
            shortTermLossesUsdSum += Math.abs(gainUsd);
          }
        }
      }

      const totalGains = shortTermGains + longTermGains;
      const totalLosses = roundTo2dp(shortTermLosses + longTermLosses);

      // ATO loss offsetting order:
      // 1. Offset losses against short-term gains first
      let lossesRemaining = totalLosses;
      const shortTermAfterLosses = Math.max(0, shortTermGains - lossesRemaining);
      lossesRemaining = Math.max(0, lossesRemaining - shortTermGains);

      // 2. Offset remaining losses against long-term gains
      const longTermAfterLosses = Math.max(0, longTermGains - lossesRemaining);
      lossesRemaining = Math.max(0, lossesRemaining - longTermGains);

      // 3. Apply 50% discount to long-term gains after losses
      const discountAmount = roundTo2dp(longTermAfterLosses * 0.5);
      const discountedLongTerm = roundTo2dp(longTermAfterLosses - discountAmount);

      // 4. Net capital gain
      const netCapitalGain = roundTo2dp(shortTermAfterLosses + discountedLongTerm);
      const netCapitalLoss = roundTo2dp(lossesRemaining);

      return {
        financialYear: fy,
        lots,
        shortTermGains: aud(roundTo2dp(shortTermGains)),
        longTermGains: aud(roundTo2dp(longTermGains)),
        totalGains: aud(roundTo2dp(totalGains)),
        shortTermLosses: aud(roundTo2dp(shortTermLosses)),
        longTermLosses: aud(roundTo2dp(longTermLosses)),
        totalLosses: aud(totalLosses),
        shortTermAfterLosses: aud(roundTo2dp(shortTermAfterLosses)),
        longTermAfterLosses: aud(roundTo2dp(longTermAfterLosses)),
        discountAmount: aud(discountAmount),
        discountedLongTerm: aud(discountedLongTerm),
        netCapitalGain: aud(netCapitalGain),
        netCapitalLoss: aud(netCapitalLoss),
        shortTermGainsUsd: usd(roundTo2dp(shortTermGainsUsdSum)),
        longTermGainsUsd: usd(roundTo2dp(longTermGainsUsdSum)),
        shortTermLossesUsd: usd(roundTo2dp(shortTermLossesUsdSum)),
        longTermLossesUsd: usd(roundTo2dp(longTermLossesUsdSum)),
        totalGainsUsd: usd(roundTo2dp(shortTermGainsUsdSum + longTermGainsUsdSum)),
        totalLossesUsd: usd(roundTo2dp(shortTermLossesUsdSum + longTermLossesUsdSum)),
        totalGainLossUsd: usd(roundTo2dp(
          shortTermGainsUsdSum + longTermGainsUsdSum - shortTermLossesUsdSum - longTermLossesUsdSum
        )),
      };
    });
  }

  return { calculateByLot, aggregateByFy };
}
