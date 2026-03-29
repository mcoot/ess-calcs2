import { describe, it, expect } from "vitest";
import {
  roundTo2dp,
  formatCurrency,
  addUsd,
  subtractUsd,
  multiplyUsd,
  sumUsd,
  addAud,
  subtractAud,
  multiplyAud,
  sumAud,
} from "./money";
import { usd, aud } from "@/types";

// ── roundTo2dp ───────────────────────────────────────────────────────

describe("roundTo2dp", () => {
  it("rounds down excess decimals", () => {
    expect(roundTo2dp(1.999)).toBe(2.0);
  });

  it("rounds 1.005 up to 1.01", () => {
    expect(roundTo2dp(1.005)).toBe(1.01);
  });

  it("rounds 1.235 up to 1.24", () => {
    expect(roundTo2dp(1.235)).toBe(1.24);
  });

  it("leaves a 2dp value unchanged", () => {
    expect(roundTo2dp(1.5)).toBe(1.5);
  });

  it("rounds negative values", () => {
    expect(roundTo2dp(-1.235)).toBe(-1.24);
  });

  it("handles zero", () => {
    expect(roundTo2dp(0)).toBe(0);
  });
});

// ── formatCurrency ───────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats USD with US$ prefix, comma grouping and 2dp", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("US$1,234.50");
  });

  it("formats AUD with A$ prefix", () => {
    expect(formatCurrency(1234.5, "AUD")).toBe("A$1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0, "USD")).toBe("US$0.00");
  });

  it("formats negative values", () => {
    expect(formatCurrency(-500.1, "USD")).toBe("-US$500.10");
  });

  it("formats large numbers with comma grouping", () => {
    expect(formatCurrency(1234567.89, "AUD")).toBe("A$1,234,567.89");
  });
});

// ── USD arithmetic ───────────────────────────────────────────────────

describe("USD arithmetic", () => {
  it("addUsd adds two USD values", () => {
    expect(addUsd(usd(10.5), usd(20.25))).toBe(30.75);
  });

  it("subtractUsd subtracts two USD values", () => {
    expect(subtractUsd(usd(100), usd(30.5))).toBe(69.5);
  });

  it("multiplyUsd multiplies USD by a scalar", () => {
    expect(multiplyUsd(usd(10), 3)).toBe(30);
  });

  it("sumUsd sums an array of USD values", () => {
    expect(sumUsd([usd(10), usd(20), usd(30)])).toBe(60);
  });

  it("sumUsd returns usd(0) for empty array", () => {
    expect(sumUsd([])).toBe(0);
  });
});

// ── AUD arithmetic ───────────────────────────────────────────────────

describe("AUD arithmetic", () => {
  it("addAud adds two AUD values", () => {
    expect(addAud(aud(10.5), aud(20.25))).toBe(30.75);
  });

  it("subtractAud subtracts two AUD values", () => {
    expect(subtractAud(aud(100), aud(30.5))).toBe(69.5);
  });

  it("multiplyAud multiplies AUD by a scalar", () => {
    expect(multiplyAud(aud(10), 3)).toBe(30);
  });

  it("sumAud sums an array of AUD values", () => {
    expect(sumAud([aud(10), aud(20), aud(30)])).toBe(60);
  });

  it("sumAud returns aud(0) for empty array", () => {
    expect(sumAud([])).toBe(0);
  });
});
