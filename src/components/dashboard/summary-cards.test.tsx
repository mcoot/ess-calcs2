import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryCards } from "./summary-cards";
import type { DashboardSummary } from "@/services/dashboard.service";
import { aud, usd } from "@/types";

const emptySummary: DashboardSummary = {
  totalEssIncomeAud: aud(0),
  netCapitalGainsAud: aud(0),
  totalCapitalLossesAud: aud(0),
  totalEssIncomeUsd: usd(0),
  netCapitalGainsUsd: usd(0),
  totalCapitalLossesUsd: usd(0),
  awardsCount: 0,
  totalSharesVested: 0,
  totalSharesSold: 0,
  availableFinancialYears: [],
};

const sampleSummary: DashboardSummary = {
  totalEssIncomeAud: aud(45000.5),
  netCapitalGainsAud: aud(12500.75),
  totalCapitalLossesAud: aud(3200),
  totalEssIncomeUsd: usd(32000.25),
  netCapitalGainsUsd: usd(9100.50),
  totalCapitalLossesUsd: usd(2400),
  awardsCount: 3,
  totalSharesVested: 250,
  totalSharesSold: 180,
  availableFinancialYears: ["2021-22", "2022-23"],
};

describe("SummaryCards", () => {
  it("renders all 6 cards with correct labels", () => {
    render(<SummaryCards summary={sampleSummary} displayCurrency="AUD" />);

    expect(screen.getByText("Total ESS Income")).toBeDefined();
    expect(screen.getByText("Total Capital Gains")).toBeDefined();
    expect(screen.getByText("Total Capital Losses")).toBeDefined();
    expect(screen.getByText("Awards")).toBeDefined();
    expect(screen.getByText("Shares Vested")).toBeDefined();
    expect(screen.getByText("Shares Sold")).toBeDefined();
  });

  it("renders subtitles", () => {
    render(<SummaryCards summary={sampleSummary} displayCurrency="AUD" />);

    expect(screen.getByText("Assessable ESS discount income")).toBeDefined();
    expect(screen.getByText("Net capital gains after discount")).toBeDefined();
    expect(screen.getByText("Unapplied capital losses")).toBeDefined();
    expect(screen.getByText("RSU grants")).toBeDefined();
    expect(screen.getByText("Across all grants")).toBeDefined();
    expect(screen.getByText("Long shares sold")).toBeDefined();
  });

  it("displays AUD formatted currency values", () => {
    render(<SummaryCards summary={sampleSummary} displayCurrency="AUD" />);

    expect(screen.getByText("A$45,000.50")).toBeDefined();
    expect(screen.getByText("A$12,500.75")).toBeDefined();
    expect(screen.getByText("A$3,200.00")).toBeDefined();
  });

  it("displays share counts and award count", () => {
    render(<SummaryCards summary={sampleSummary} displayCurrency="AUD" />);

    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("250")).toBeDefined();
    expect(screen.getByText("180")).toBeDefined();
  });

  it("displays USD formatted currency values when USD selected", () => {
    render(<SummaryCards summary={sampleSummary} displayCurrency="USD" />);

    expect(screen.getByText("US$32,000.25")).toBeDefined();
    expect(screen.getByText("US$9,100.50")).toBeDefined();
    expect(screen.getByText("US$2,400.00")).toBeDefined();
  });

  it("renders zero values for empty summary", () => {
    render(<SummaryCards summary={emptySummary} displayCurrency="AUD" />);

    // 3 currency cards show A$0.00
    expect(screen.getAllByText("A$0.00")).toHaveLength(3);
    // 3 count cards show 0
    expect(screen.getAllByText("0")).toHaveLength(3);
  });
});
