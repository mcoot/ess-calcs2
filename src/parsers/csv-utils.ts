export type ParseResult<T> =
  | { ok: true; data: T[] }
  | { ok: false; error: string };

export function parseMoney(raw: string): number {
  const cleaned = raw.replace(/"/g, "").replace(/\$/g, "").replace(/,/g, "");
  return parseFloat(cleaned);
}

export function parseShares(raw: string): number {
  const cleaned = raw.replace(/"/g, "").replace(/,/g, "");
  return parseInt(cleaned, 10);
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
