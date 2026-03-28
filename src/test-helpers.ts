import type { ForexService } from "@/services/forex.service";
import { aud, usd } from "@/types";

/** Create a UTC Date — shorthand for test data. */
export function d(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m - 1, day));
}

/** Minimal forex stub for component tests that don't exercise conversion. */
export const stubForex: ForexService = {
  getRate: () => ({ rate: 0.75, rateDate: new Date() }),
  usdToAud: (amount) => ({ aud: aud((amount as number) / 0.75), rate: 0.75, rateDate: new Date() }),
  audToUsd: (amount) => ({ usd: usd((amount as number) * 0.75), rate: 0.75, rateDate: new Date() }),
  getDateRange: () => ({ earliest: new Date(), latest: new Date() }),
};
