import type { RsuRelease } from "@/types";
import { RsuReleaseSchema } from "@/types";
import type { ParseResult } from "./csv-utils";
import { splitCsvRow, parseMoney, parseShares } from "./csv-utils";
import { parseDDMonYYYY } from "@/lib/dates";

const HEADER_ROWS = 2; // title, headers

/**
 * Parse a Shareworks RSU Releases CSV export into RsuRelease records.
 */
export function parseRsuReleases(csv: string): ParseResult<RsuRelease> {
  try {
    const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
    const dataLines = lines.slice(HEADER_ROWS);

    const releases: RsuRelease[] = [];
    for (const line of dataLines) {
      const cols = splitCsvRow(line);

      // Skip total row (empty grant number)
      const grantNumberRaw = cols[3]?.trim();
      if (!grantNumberRaw) continue;

      const saleDateRaw = cols[15]?.trim();
      const salePriceRaw = cols[16]?.trim();
      const saleProceedsRaw = cols[18]?.trim();

      const parsed = RsuReleaseSchema.parse({
        grantDate: parseDDMonYYYY(cols[2].trim()),
        grantNumber: parseInt(grantNumberRaw, 10),
        grantName: cols[5].trim(),
        grantReason: cols[6].trim(),
        releaseDate: parseDDMonYYYY(cols[7].trim()),
        sharesVested: parseShares(cols[8]),
        sharesSoldToCover: parseShares(cols[9]),
        sharesHeld: parseShares(cols[10]),
        valueUsd: parseMoney(cols[11]),
        fmvPerShare: parseMoney(cols[13]),
        saleDateSellToCover: saleDateRaw ? parseDDMonYYYY(saleDateRaw) : undefined,
        salePricePerShare: salePriceRaw ? parseMoney(salePriceRaw) : undefined,
        saleProceeds: saleProceedsRaw ? parseMoney(saleProceedsRaw) : undefined,
        sellToCoverAmount: parseMoney(cols[20]),
        releaseReferenceNumber: cols[22].trim(),
      });

      releases.push(parsed);
    }

    return { ok: true, data: releases };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
