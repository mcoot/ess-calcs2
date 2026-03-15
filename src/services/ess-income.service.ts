import type { Award, ForexRate, AUD } from "@/types";

export interface EssIncomeResult {
  vestingDate: string;
  sharesVested: number;
  priceAtVestUsd: number;
  priceAtVestAud: AUD;
  discountPerShareAud: AUD;
  totalDiscountAud: AUD;
}

export interface EssIncomeService {
  /**
   * Calculate ESS taxable income for each vesting event.
   * The taxable amount is the market value at vest minus the employee's cost basis.
   */
  calculateEssIncome(awards: Award[], forexRates: ForexRate[]): EssIncomeResult[];

  /** Sum all taxable ESS income for a financial year. */
  totalEssIncome(awards: Award[], forexRates: ForexRate[], financialYear: number): AUD;
}

export function createEssIncomeService(): EssIncomeService {
  throw new Error("not implemented");
}
