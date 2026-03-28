import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CgtDrilldown } from "./cgt-drilldown";
import type { CgtReportRow } from "@/services/report.service";
import { usd, aud } from "@/types";
import { d } from "@/test-helpers";

const longTermRow: CgtReportRow = {
  saleDate: d(2024, 1, 15),
  acquisitionDate: d(2022, 10, 3),
  grantNumber: 9375,
  grantName: "2018 RSU Grant",
  lotNumber: 1,
  sharesSold: 20,
  holdingDays: 469,
  discountEligible: true,
  costBasisUsd: usd(2000),
  costBasisAud: aud(3076.92),
  costBasisRate: 0.65,
  costBasisRateDate: d(2022, 10, 3),
  grossProceedsUsd: usd(3000),
  brokerageUsd: usd(14.95),
  feesUsd: usd(0.08),
  netProceedsUsd: usd(2984.97),
  netProceedsAud: aud(4389.66),
  proceedsRate: 0.68,
  proceedsRateDate: d(2024, 1, 15),
  capitalGainLossAud: aud(1312.74),
};

const shortTermRow: CgtReportRow = {
  ...longTermRow,
  saleDate: d(2023, 1, 9),
  holdingDays: 98,
  discountEligible: false,
};

describe("CgtDrilldown", () => {
  it("renders cost basis and proceeds breakdown", () => {
    render(<CgtDrilldown row={longTermRow} />);

    // Cost basis
    expect(screen.getByText(/Cost basis.*\$2,000\.00.*0\.6500.*A\$3,076\.92/)).toBeDefined();
    // Proceeds breakdown
    expect(screen.getByText(/Gross.*\$3,000\.00/)).toBeDefined();
    expect(screen.getByText(/Brokerage.*\$14\.95/)).toBeDefined();
    expect(screen.getByText(/Fees.*\$0\.08/)).toBeDefined();
    expect(screen.getByText(/Net.*\$2,984\.97.*0\.6800.*A\$4,389\.66/)).toBeDefined();
    // Gain
    expect(screen.getByText(/A\$4,389\.66 − A\$3,076\.92 = A\$1,312\.74/)).toBeDefined();
  });

  it("shows discount eligibility for long-term holdings", () => {
    render(<CgtDrilldown row={longTermRow} />);

    expect(screen.getByText(/469 days/)).toBeDefined();
    expect(screen.getByText(/Discount eligible/i)).toBeDefined();
  });

  it("shows not eligible for short-term holdings", () => {
    render(<CgtDrilldown row={shortTermRow} />);

    expect(screen.getByText(/98 days/)).toBeDefined();
    expect(screen.getByText(/Not eligible/i)).toBeDefined();
  });
});
