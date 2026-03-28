import type { ZodType } from "zod";

export type ParseResult<T> =
  | { ok: true; data: T[] }
  | { ok: false; error: string };

export function parseMoney(raw: string): number {
  return parseFloat(raw.replace(/["$,]/g, ""));
}

export function parseShares(raw: string): number {
  return parseInt(raw.replace(/[",]/g, ""), 10);
}

export function parseBoolean(raw: string): boolean {
  if (raw === "YES") return true;
  if (raw === "NO") return false;
  throw new Error(`Invalid boolean value: "${raw}"`);
}

export function splitCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export function splitCsvLines(csv: string, headerRows: number): string[] {
  return csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .slice(headerRows);
}

export function wrapParse<T>(fn: () => T[]): ParseResult<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
