import type { ForexRate, USD, AUD } from "@/types";

export interface ForexService {
  /**
   * Look up the AUD/USD rate for a given date.
   * Returns the rate for the closest available date on or before `date`.
   * Throws AppError(MISSING_RATE) if no rate can be found.
   */
  getRateForDate(date: string): ForexRate;

  /** Convert a USD amount to AUD using the rate for the given date. */
  convertToAud(amountUsd: USD, date: string): AUD;
}

export function createForexService(_rates: ForexRate[]): ForexService {
  throw new Error("not implemented");
}
