import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SalesTable } from "./sales-table";
import type { SaleLot } from "@/types";
import type { SaleLotCgt } from "@/services/cgt.service";
import { usd, aud } from "@/types";
import { d } from "@/test-helpers";

// ── Fixtures ────────────────────────────────────────────────────────

const normalLot: SaleLot = {
  withdrawalReferenceNumber: "WRC6476B1C8-1EE",
  originatingReleaseRef: "RB54549F21",
  grantNumber: 9375,
  grantName: "02.15.2018 RSU Grant (New Hire)",
  lotNumber: 1,
  saleType: "Long Shares",
  saleDate: d(2021, 8, 3),
  originalAcquisitionDate: d(2020, 2, 18),
  soldWithin30Days: false,
  costBasisPerShare: usd(104.90),
  costBasis: usd(3147.00),
  sharesSold: 30,
  saleProceeds: usd(9780.00),
  salePricePerShare: usd(326.00),
  brokerageCommission: usd(2.33),
  supplementalTransactionFee: usd(0.05),
};

const normalCgt: SaleLotCgt = {
  withdrawalRef: "WRC6476B1C8-1EE",
  originatingReleaseRef: "RB54549F21",
  grantNumber: 9375,
  lotNumber: 1,
  saleDate: d(2021, 8, 3),
  acquisitionDate: d(2020, 2, 18),
  costBasisUsd: usd(3147.00),
  grossProceedsUsd: usd(9780.00),
  brokerageUsd: usd(2.33),
  feesUsd: usd(0.05),
  netProceedsUsd: usd(9777.62),
  sharesSold: 30,
  acquisitionForexRate: 0.67,
  acquisitionForexDate: d(2020, 2, 18),
  saleForexRate: 0.74,
  saleForexDate: d(2021, 8, 3),
  costBasisAud: aud(4697.01),
  netProceedsAud: aud(13213.00),
  capitalGainLossAud: aud(8515.99),
  holdingDays: 531,
  isLongTerm: true,
  isDiscountEligible: true,
  financialYear: "2021-22",
};

const thirtyDayLot: SaleLot = {
  ...normalLot,
  withdrawalReferenceNumber: "WRC-30DAY",
  lotNumber: 2,
  saleDate: d(2020, 3, 5),
  originalAcquisitionDate: d(2020, 2, 18),
  soldWithin30Days: true,
};

// ── Tests ───────────────────────────────────────────────────────────

describe("SalesTable", () => {
  it("shows empty state when no sale lots", () => {
    render(<SalesTable lots={[]} cgtResults={[]} />);
    expect(screen.getByText(/no sales/i)).toBeDefined();
  });

  it("renders a non-30-day lot with CGT gain/loss", () => {
    render(<SalesTable lots={[normalLot]} cgtResults={[normalCgt]} />);
    expect(screen.getByText("9375")).toBeDefined();
    expect(screen.getByText("30")).toBeDefined();
    expect(screen.getByText("A$8,515.99")).toBeDefined();
    expect(screen.getByText("2021-22")).toBeDefined();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2); // header + 1 data
  });

  it("renders a 30-day lot with badge and no CGT", () => {
    render(<SalesTable lots={[thirtyDayLot]} cgtResults={[]} />);
    // Badge is rendered inside the data row, not the header
    const badges = screen.getAllByText("30-Day");
    expect(badges).toHaveLength(2); // header column + badge
    // No CGT result for this lot, so gain/loss shows dash
    expect(screen.getByText("—")).toBeDefined();
  });

  it("clicking expand shows CGT detail with forex rates", async () => {
    const user = userEvent.setup();
    render(<SalesTable lots={[normalLot]} cgtResults={[normalCgt]} />);
    await user.click(screen.getByRole("button", { name: /expand/i }));
    // Should show both forex rates in the detail
    expect(screen.getByText(/0\.67/)).toBeDefined();
    expect(screen.getByText(/0\.74/)).toBeDefined();
  });
});
