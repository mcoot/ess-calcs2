import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReleasesTable } from "./releases-table";
import type { RsuRelease } from "@/types";
import type { ReleaseEssIncome, ThirtyDayLotIncome } from "@/services/ess-income.service";
import { usd, aud } from "@/types";
import { d } from "@/test-helpers";

// ── Fixtures ────────────────────────────────────────────────────────

const release: RsuRelease = {
  grantDate: d(2018, 2, 15),
  grantNumber: 9375,
  grantName: "02.15.2018 RSU Grant (New Hire)",
  grantReason: "New Hire",
  releaseDate: d(2020, 2, 18),
  sharesVested: 30,
  sharesSoldToCover: 0,
  sharesHeld: 30,
  valueUsd: usd(4616.40),
  fmvPerShare: usd(153.88),
  sellToCoverAmount: usd(0),
  releaseReferenceNumber: "RB6538C8B1",
};

const income: ReleaseEssIncome = {
  releaseRef: "RB6538C8B1",
  grantNumber: 9375,
  releaseDate: d(2020, 2, 18),
  sharesVested: 30,
  fmvPerShare: usd(153.88),
  standardShares: 30,
  standardIncomeUsd: usd(4616.40),
  standardIncomeAud: aud(6155.20),
  standardForexRate: 0.75,
  standardForexDate: d(2020, 2, 18),
  thirtyDayLots: [],
  totalEssIncomeAud: aud(6155.20),
  totalEssIncomeUsd: usd(4616.40),
  financialYear: "2019-20",
};

const thirtyDayLot: ThirtyDayLotIncome = {
  saleLotRef: "WRC123",
  saleDate: d(2020, 3, 1),
  sharesSold: 10,
  saleProceedsUsd: usd(1500),
  essIncomeAud: aud(2000),
  forexRate: 0.75,
  forexDate: d(2020, 3, 1),
  financialYear: "2019-20",
};

const incomeWith30Day: ReleaseEssIncome = {
  ...income,
  standardShares: 20,
  thirtyDayLots: [thirtyDayLot],
};

// ── Tests ───────────────────────────────────────────────────────────

describe("ReleasesTable", () => {
  it("shows empty state when no releases", () => {
    render(<ReleasesTable incomes={[]} releases={[]} displayCurrency="AUD" />);
    expect(screen.getByText(/no releases/i)).toBeDefined();
  });

  it("renders a row with ESS income and grant name", () => {
    render(<ReleasesTable incomes={[income]} releases={[release]} displayCurrency="AUD" />);
    expect(screen.getByText("9375")).toBeDefined();
    expect(screen.getByText("02.15.2018 RSU Grant (New Hire)")).toBeDefined();
    expect(screen.getByText("30")).toBeDefined();
    expect(screen.getByText("$153.88")).toBeDefined();
    expect(screen.getByText("A$6,155.20")).toBeDefined();
    expect(screen.getByText("2019-20")).toBeDefined();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2); // header + 1 data
  });

  it("shows 30-day lots count when present", () => {
    render(<ReleasesTable incomes={[incomeWith30Day]} releases={[release]} displayCurrency="AUD" />);
    // The 30-day column should show "1"
    expect(screen.getByText("1")).toBeDefined();
  });

  it("shows USD ESS income when displayCurrency is USD", () => {
    render(<ReleasesTable incomes={[income]} releases={[release]} displayCurrency="USD" />);
    expect(screen.getByText("$4,616.40")).toBeDefined();
    expect(screen.getByText("ESS Income (USD)")).toBeDefined();
  });

  it("clicking expand shows forex rate detail", async () => {
    const user = userEvent.setup();
    render(<ReleasesTable incomes={[income]} releases={[release]} displayCurrency="AUD" />);
    await user.click(screen.getByRole("button", { name: /expand/i }));
    expect(screen.getByText(/0\.75/)).toBeDefined();
  });
});
