import type { RsuRelease } from "@/types";
import type { ParseResult } from "./award-summary.parser";

/**
 * Parse a Schwab RSU Release CSV export into RsuRelease records.
 */
export function parseRsuReleases(_csv: string): ParseResult<RsuRelease> {
  throw new Error("not implemented");
}
