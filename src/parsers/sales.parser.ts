import type { SaleLot } from "@/types";
import { SaleLotSchema } from "@/types";
import type { ParseResult } from "./csv-utils";
import { splitCsvRow, parseMoney, parseShares, parseBoolean } from "./csv-utils";
import { parseDDMonYYYY } from "@/lib/dates";

const HEADER_ROWS = 2; // title, headers

/**
 * Parse a Shareworks Sales - Long Shares CSV export into SaleLot records.
 */
export function parseSales(csv: string): ParseResult<SaleLot> {
  try {
    const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
    const dataLines = lines.slice(HEADER_ROWS);

    const lots: SaleLot[] = [];
    for (const line of dataLines) {
      const cols = splitCsvRow(line);

      // Skip total row (empty withdrawal reference)
      const withdrawalRef = cols[2]?.trim();
      if (!withdrawalRef) continue;

      const parsed = SaleLotSchema.parse({
        withdrawalReferenceNumber: withdrawalRef,
        originatingReleaseRef: cols[3].trim(),
        grantNumber: parseInt(cols[4].trim(), 10),
        grantName: cols[5].trim(),
        lotNumber: parseInt(cols[6].trim(), 10),
        saleType: cols[7].trim(),
        saleDate: parseDDMonYYYY(cols[8].trim()),
        originalAcquisitionDate: parseDDMonYYYY(cols[9].trim()),
        soldWithin30Days: parseBoolean(cols[10].trim()),
        costBasisPerShare: parseMoney(cols[11]),
        costBasis: parseMoney(cols[13]),
        sharesSold: parseShares(cols[15]),
        saleProceeds: parseMoney(cols[16]),
        salePricePerShare: parseMoney(cols[18]),
        brokerageCommission: parseMoney(cols[20]),
        supplementalTransactionFee: parseMoney(cols[22]),
      });

      lots.push(parsed);
    }

    return { ok: true, data: lots };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
