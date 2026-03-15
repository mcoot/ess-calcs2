import type { Award } from "@/types";

export type ParseResult<T> =
  | { ok: true; data: T[] }
  | { ok: false; error: string };

/**
 * Parse a Schwab Award Summary CSV export into Award records.
 */
export function parseAwardSummary(_csv: string): ParseResult<Award> {
  throw new Error("not implemented");
}
