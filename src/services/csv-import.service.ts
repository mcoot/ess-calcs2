import type { DataType } from "@/types";
import type { DataStore } from "@/store/data-store";
import { parseAwardSummary } from "@/parsers/award-summary.parser";
import { parseVestingSchedule } from "@/parsers/vesting-schedule.parser";
import { parseRsuReleases } from "@/parsers/rsu-releases.parser";
import { parseSales } from "@/parsers/sales.parser";

export type ImportResult =
  | { ok: true; type: DataType; count: number }
  | { ok: false; error: string };

const CSV_TYPE_MAP: Record<string, DataType> = {
  "Award Summary": "awards",
  "Full Vesting Schedule": "vestingSchedule",
  "RSU Releases": "releases",
  "Sales - Long Shares": "saleLots",
};

export function detectCsvType(firstLine: string): DataType | null {
  return CSV_TYPE_MAP[firstLine.trim()] ?? null;
}

export async function importCsv(store: DataStore, csvText: string): Promise<ImportResult> {
  const firstLine = csvText.split(/\r?\n/, 1)[0].trim();
  const type = detectCsvType(firstLine);

  if (!type) {
    return { ok: false, error: `Unrecognized CSV type: "${firstLine}"` };
  }

  const result = parseByType(type, csvText);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await saveByType(store, type, result.data);
  return { ok: true, type, count: result.data.length };
}

function parseByType(type: DataType, csvText: string) {
  switch (type) {
    case "awards": return parseAwardSummary(csvText);
    case "vestingSchedule": return parseVestingSchedule(csvText);
    case "releases": return parseRsuReleases(csvText);
    case "saleLots": return parseSales(csvText);
    default: return { ok: false as const, error: `Unsupported type: ${type}` };
  }
}

async function saveByType(store: DataStore, type: DataType, data: unknown[]) {
  switch (type) {
    case "awards": await store.saveAwards(data as any); break;
    case "vestingSchedule": await store.saveVestingSchedule(data as any); break;
    case "releases": await store.saveRsuReleases(data as any); break;
    case "saleLots": await store.saveSaleLots(data as any); break;
  }
}
