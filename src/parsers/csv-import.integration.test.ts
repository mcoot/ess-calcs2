import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseAwardSummary } from "./award-summary.parser";
import { parseVestingSchedule } from "./vesting-schedule.parser";
import { parseRsuReleases } from "./rsu-releases.parser";
import { parseSales } from "./sales.parser";

const sampleDir = path.resolve(__dirname, "../../data/sample");

function readSample(filename: string): string {
  return fs.readFileSync(path.join(sampleDir, filename), "utf-8");
}

describe("CSV import integration (real sample files)", () => {
  it("Award Summary: parses all 10 awards", () => {
    const result = parseAwardSummary(readSample("Award Summary.csv"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(10);
    const first = result.data[0];
    expect(first.grantNumber).toBe(9375);
    expect(first.grantName).toBe("02.15.2018 RSU Grant (New Hire)");
    expect(first.conversionPrice).toBe(52.6476);
    expect(first.sharesGranted).toBe(475);
  });

  it("Full Vesting Schedule: parses all 135 entries", () => {
    const result = parseVestingSchedule(readSample("Full Vesting Schedule.csv"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(135);
    const first = result.data[0];
    expect(first.grantNumber).toBe(9375);
    expect(first.vestDate).toEqual(new Date(Date.UTC(2019, 1, 18)));
    expect(first.shares).toBe(118);
  });

  it("RSU Releases: parses all release rows", () => {
    const result = parseRsuReleases(readSample("RSU Releases.csv"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBeGreaterThan(90);
    const first = result.data[0];
    expect(first.grantNumber).toBe(9375);
    expect(first.releaseReferenceNumber).toBe("RB6538C8B1");
    expect(first.fmvPerShare).toBe(153.88);
  });

  it("Sales - Long Shares: parses all sale lots", () => {
    const result = parseSales(readSample("Sales - Long Shares.csv"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBeGreaterThan(100);
    const first = result.data[0];
    expect(first.withdrawalReferenceNumber).toBe("WRC6476B1C8-1EE");
    expect(first.grantNumber).toBe(9375);
    expect(first.soldWithin30Days).toBe(false);
    expect(first.costBasisPerShare).toBe(104.90);
  });
});
