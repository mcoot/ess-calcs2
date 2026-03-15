import type { SaleLot } from "@/types";
import type { ParseResult } from "./award-summary.parser";

/**
 * Parse a Schwab Gains & Losses CSV export into SaleLot records.
 */
export function parseSales(_csv: string): ParseResult<SaleLot> {
  throw new Error("not implemented");
}
