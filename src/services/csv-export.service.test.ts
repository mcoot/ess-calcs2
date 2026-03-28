import { describe, it, expect } from "vitest";
import { createCsvExportService } from "./csv-export.service";
import type { EssIncomeReportRow, CgtReportRow, ThirtyDaySummaryRow } from "./report.service";
import { usd, aud } from "@/types";
import { d } from "@/test-helpers";

const BOM = "\uFEFF";

const sampleEssRow: EssIncomeReportRow = {
  date: d(2024, 2, 12),
  grantNumber: 9375,
  grantName: "2018 RSU Grant (New Hire)",
  releaseRef: "RB-001",
  shares: 100,
  fmvPerShareUsd: usd(150.5),
  grossValueUsd: usd(15050),
  exchangeRate: 0.65,
  rateDate: d(2024, 2, 12),
  essIncomeAud: aud(23153.85),
  is30DayRule: false,
  notes: "",
};

const sampleCgtRow: CgtReportRow = {
  saleDate: d(2024, 1, 15),
  acquisitionDate: d(2022, 10, 3),
  grantNumber: 9375,
  grantName: "2018 RSU Grant (New Hire)",
  lotNumber: 1,
  sharesSold: 20,
  holdingDays: 469,
  discountEligible: true,
  costBasisUsd: usd(2000),
  costBasisAud: aud(3076.92),
  costBasisRate: 0.65,
  costBasisRateDate: d(2022, 10, 3),
  grossProceedsUsd: usd(3000),
  brokerageUsd: usd(0),
  feesUsd: usd(0),
  netProceedsUsd: usd(3000),
  netProceedsAud: aud(4411.76),
  proceedsRate: 0.68,
  proceedsRateDate: d(2024, 1, 15),
  capitalGainLossAud: aud(1334.84),
};

const sample30DayRow: ThirtyDaySummaryRow = {
  saleDate: d(2024, 2, 22),
  vestDate: d(2024, 2, 12),
  daysHeld: 10,
  grantNumber: 9375,
  grantName: "2018 RSU Grant (New Hire)",
  shares: 30,
  saleProceedsUsd: usd(4500),
  essIncomeAud: aud(6716.42),
};

describe("CsvExportService", () => {
  describe("exportEssIncomeCsv", () => {
    it("starts with UTF-8 BOM", () => {
      const svc = createCsvExportService();
      const csv = svc.exportEssIncomeCsv([], "2023-24");
      expect(csv.startsWith(BOM)).toBe(true);
    });

    it("has correct headers", () => {
      const svc = createCsvExportService();
      const csv = svc.exportEssIncomeCsv([], "2023-24");
      const headerLine = csv.replace(BOM, "").split("\n")[0];
      expect(headerLine).toBe(
        "Date,Grant Number,Grant Name,Release Ref,Shares,FMV/Share (USD),Gross Value (USD),Exchange Rate,Rate Date,ESS Income (AUD),30-Day Rule,Notes",
      );
    });

    it("formats data rows correctly", () => {
      const svc = createCsvExportService();
      const csv = svc.exportEssIncomeCsv([sampleEssRow], "2023-24");
      const lines = csv.replace(BOM, "").split("\n");
      expect(lines).toHaveLength(2); // header + 1 data row
      const row = lines[1];
      expect(row).toContain("2018 RSU Grant (New Hire)");
      expect(row).toContain("9375");
      expect(row).toContain("RB-001");
      expect(row).toContain("100");
      expect(row).toContain("150.50");
      expect(row).toContain("15050.00");
      expect(row).toContain("0.6500");
      expect(row).toContain("23153.85");
      expect(row).toContain("No"); // not 30-day
    });
  });

  describe("exportCgtCsv", () => {
    it("starts with UTF-8 BOM and has correct headers", () => {
      const svc = createCsvExportService();
      const csv = svc.exportCgtCsv([], "2023-24");
      expect(csv.startsWith(BOM)).toBe(true);
      const headerLine = csv.replace(BOM, "").split("\n")[0];
      expect(headerLine).toBe(
        "Sale Date,Acquisition Date,Grant Number,Grant Name,Lot,Shares Sold,Holding Period (Days),Discount Eligible,Cost Basis (USD),Cost Basis (AUD),Cost Basis Rate,Cost Basis Rate Date,Net Proceeds (USD),Net Proceeds (AUD),Proceeds Rate,Proceeds Rate Date,Capital Gain/Loss (AUD)",
      );
    });

    it("formats data rows correctly", () => {
      const svc = createCsvExportService();
      const csv = svc.exportCgtCsv([sampleCgtRow], "2023-24");
      const lines = csv.replace(BOM, "").split("\n");
      expect(lines).toHaveLength(2);
      const row = lines[1];
      expect(row).toContain("469");
      expect(row).toContain("Yes"); // discount eligible
      expect(row).toContain("2000.00");
      expect(row).toContain("3076.92");
      expect(row).toContain("1334.84");
    });
  });

  describe("exportThirtyDayCsv", () => {
    it("starts with UTF-8 BOM and has correct headers", () => {
      const svc = createCsvExportService();
      const csv = svc.exportThirtyDayCsv([], "2023-24");
      expect(csv.startsWith(BOM)).toBe(true);
      const headerLine = csv.replace(BOM, "").split("\n")[0];
      expect(headerLine).toBe(
        "Sale Date,Vest Date,Days Held,Grant Number,Grant Name,Shares,Sale Proceeds (USD),ESS Income (AUD)",
      );
    });

    it("formats data rows correctly", () => {
      const svc = createCsvExportService();
      const csv = svc.exportThirtyDayCsv([sample30DayRow], "2023-24");
      const lines = csv.replace(BOM, "").split("\n");
      expect(lines).toHaveLength(2);
      const row = lines[1];
      expect(row).toContain("10");
      expect(row).toContain("30");
      expect(row).toContain("4500.00");
      expect(row).toContain("6716.42");
    });
  });
});
