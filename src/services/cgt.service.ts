import type { SaleLot, ForexRate, AUD } from "@/types";

export interface CgtLotResult {
  saleDate: string;
  sharesSold: number;
  proceedsAud: AUD;
  costBaseAud: AUD;
  capitalGainAud: AUD;
  discountApplied: boolean;
  taxableGainAud: AUD;
}

export interface CgtSummary {
  lots: CgtLotResult[];
  totalGrossGainAud: AUD;
  totalTaxableGainAud: AUD;
}

export interface CgtService {
  /**
   * Calculate CGT for each sale lot.
   * Applies 50% CGT discount for lots held > 12 months.
   */
  calculateCgt(lots: SaleLot[], forexRates: ForexRate[]): CgtSummary;

  /** Filter lots to a specific financial year by sale date. */
  filterByFinancialYear(lots: SaleLot[], financialYear: number): SaleLot[];
}

export function createCgtService(): CgtService {
  throw new Error("not implemented");
}
