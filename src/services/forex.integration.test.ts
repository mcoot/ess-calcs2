import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseForexCsv } from "@/parsers/forex.parser";
import { createForexService, type ForexService } from "./forex.service";
import { AppError, ErrorCodes } from "@/lib/errors";
import { usd } from "@/types";
import { d } from "@/test-helpers";

describe("ForexService integration (real CSV)", () => {
  let service: ForexService;

  beforeAll(() => {
    const csvPath = path.resolve(__dirname, "../../data/public/rba-forex.csv");
    const csv = fs.readFileSync(csvPath, "utf-8");
    const rates = parseForexCsv(csv);
    service = createForexService(rates);
  });

  it("golden: exact match for 2023-01-03", () => {
    const result = service.getRate(d(2023, 1, 3));
    expect(result.rate).toBe(0.6828);
    expect(result.rateDate).toEqual(d(2023, 1, 3));
  });

  it("golden: weekend fallback for 2023-01-07 returns Jan 6", () => {
    const result = service.getRate(d(2023, 1, 7));
    expect(result.rate).toBe(0.6769);
    expect(result.rateDate).toEqual(d(2023, 1, 6));
  });

  it("golden: USD to AUD conversion on 2023-01-03", () => {
    const result = service.usdToAud(usd(100), d(2023, 1, 3));
    expect(result.aud).toBeCloseTo(146.46, 2);
    expect(result.rate).toBe(0.6828);
  });

  it("throws MISSING_RATE for date before all data", () => {
    expect(() => service.getRate(d(2017, 1, 1))).toThrow(AppError);
    expect(() => service.getRate(d(2017, 1, 1))).toThrow(
      expect.objectContaining({ code: ErrorCodes.MISSING_RATE })
    );
  });

  it("date range starts at 2018-01-02", () => {
    const range = service.getDateRange();
    expect(range.earliest).toEqual(d(2018, 1, 2));
  });
});
