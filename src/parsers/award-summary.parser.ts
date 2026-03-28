import type { Award } from "@/types";
import { AwardSchema } from "@/types";
import type { ParseResult } from "./csv-utils";
import { splitCsvRow, parseMoney, parseShares } from "./csv-utils";
import { parseDDMonYYYY } from "@/lib/dates";

const HEADER_ROWS = 3; // title, headers, sub-headers

/**
 * Parse a Shareworks Award Summary CSV export into Award records.
 */
export function parseAwardSummary(csv: string): ParseResult<Award> {
  try {
    const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
    const dataLines = lines.slice(HEADER_ROWS);

    const awards: Award[] = [];
    for (const line of dataLines) {
      const cols = splitCsvRow(line);

      // Skip total row (empty grant number)
      const grantNumberRaw = cols[2]?.trim();
      if (!grantNumberRaw) continue;

      const parsed = AwardSchema.parse({
        grantDate: parseDDMonYYYY(cols[1].trim()),
        grantNumber: parseInt(grantNumberRaw, 10),
        grantType: cols[3].trim(),
        grantName: cols[4].trim(),
        grantReason: cols[5].trim(),
        conversionPrice: parseMoney(cols[6]),
        sharesGranted: parseShares(cols[8]),
      });

      awards.push(parsed);
    }

    return { ok: true, data: awards };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
