import type { ForexRate } from "@/types";
import { parseDDMonYYYY } from "@/lib/dates";
import { AppError, ErrorCodes } from "@/lib/errors";

export function parseForexCsv(csvText: string): ForexRate[] {
  const text = csvText.replace(/^\uFEFF/, "");
  const dataLines = text.split("\n").filter((l) => l.trim() !== "");

  const rates: ForexRate[] = dataLines.map((line, i) => {
    const cols = line.split(",");
    const dateStr = cols[0].trim();
    const rateStr = cols[1]?.trim() ?? "";

    if (rateStr === "") {
      throw new AppError(
        ErrorCodes.PARSE_ERROR,
        `Empty rate at data row ${i + 1}: "${line}"`
      );
    }

    const rate = Number(rateStr);
    if (isNaN(rate)) {
      throw new AppError(
        ErrorCodes.PARSE_ERROR,
        `Non-numeric rate at data row ${i + 1}: "${rateStr}"`
      );
    }

    if (rate <= 0) {
      throw new AppError(
        ErrorCodes.PARSE_ERROR,
        `Rate must be positive at data row ${i + 1}: ${rate}`
      );
    }

    const date = parseDDMonYYYY(dateStr);

    return { date, audToUsd: rate };
  });

  rates.sort((a, b) => a.date.getTime() - b.date.getTime());

  return rates;
}
