import type { VestingScheduleEntry } from "@/types";
import { VestingScheduleEntrySchema } from "@/types";
import type { ParseResult } from "./csv-utils";
import { splitCsvRow, parseShares } from "./csv-utils";
import { parseDDMonYYYY } from "@/lib/dates";

const HEADER_ROWS = 2; // title, headers
const SECTION_BREAK = /^Grant Number:/;

/**
 * Parse a Shareworks Vesting Schedule CSV export into VestingScheduleEntry records.
 */
export function parseVestingSchedule(csv: string): ParseResult<VestingScheduleEntry> {
  try {
    const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
    const dataLines = lines.slice(HEADER_ROWS);

    const entries: VestingScheduleEntry[] = [];
    for (const line of dataLines) {
      // Skip section breaks
      if (SECTION_BREAK.test(line)) continue;

      const cols = splitCsvRow(line);

      // Skip total rows (empty grant number)
      const grantNumberRaw = cols[2]?.trim();
      if (!grantNumberRaw) continue;

      const parsed = VestingScheduleEntrySchema.parse({
        grantNumber: parseInt(grantNumberRaw, 10),
        vestDate: parseDDMonYYYY(cols[6].trim()),
        shares: parseShares(cols[7]),
      });

      entries.push(parsed);
    }

    return { ok: true, data: entries };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
