import { AppError, ErrorCodes } from "./errors";

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const DD_MON_YYYY = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/;

export function parseDDMonYYYY(s: string): Date {
  const match = DD_MON_YYYY.exec(s);
  if (!match) {
    throw new AppError(ErrorCodes.PARSE_ERROR, `Invalid date format: "${s}"`);
  }

  const day = Number(match[1]);
  const monthStr = match[2];
  const year = Number(match[3]);

  if (isNaN(day) || isNaN(year)) {
    throw new AppError(ErrorCodes.PARSE_ERROR, `Invalid date format: "${s}"`);
  }

  const month = MONTHS[monthStr];
  if (month === undefined) {
    throw new AppError(ErrorCodes.PARSE_ERROR, `Invalid month: "${monthStr}"`);
  }

  const date = new Date(Date.UTC(year, month, day));

  // Validate the date didn't roll over (e.g. Feb 29 on non-leap year → Mar 1)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    throw new AppError(ErrorCodes.PARSE_ERROR, `Invalid date: "${s}"`);
  }

  return date;
}

export function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getFinancialYear(date: Date): number {
  const month = date.getUTCMonth(); // 0-based
  const year = date.getUTCFullYear();
  return month >= 6 ? year + 1 : year;
}

export function isInFinancialYear(date: Date, fy: number): boolean {
  return getFinancialYear(date) === fy;
}

const MILLIS_PER_DAY = 86_400_000;

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MILLIS_PER_DAY);
}

export function toFyString(date: Date): string {
  const fy = getFinancialYear(date);
  const startYear = fy - 1;
  const endYY = String(fy).slice(2);
  return `${startYear}-${endYY}`;
}
