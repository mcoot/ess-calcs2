import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EssIncomeDrilldown } from "./ess-income-drilldown";
import type { EssIncomeReportRow } from "@/services/report.service";
import { usd, aud } from "@/types";
import { d } from "@/test-helpers";

const standardRow: EssIncomeReportRow = {
  date: d(2024, 2, 12),
  grantNumber: 9375,
  grantName: "2018 RSU Grant",
  releaseRef: "RB-001",
  shares: 100,
  fmvPerShareUsd: usd(150),
  grossValueUsd: usd(15000),
  exchangeRate: 0.65,
  rateDate: d(2024, 2, 12),
  essIncomeAud: aud(23076.92),
  is30DayRule: false,
  notes: "",
};

const thirtyDayRow: EssIncomeReportRow = {
  ...standardRow,
  date: d(2024, 2, 22),
  shares: 30,
  grossValueUsd: usd(4500),
  exchangeRate: 0.67,
  rateDate: d(2024, 2, 22),
  essIncomeAud: aud(6716.42),
  is30DayRule: true,
  notes: "Sold 10 days after vest",
};

describe("EssIncomeDrilldown", () => {
  it("renders standard vesting calculation breakdown", () => {
    render(<EssIncomeDrilldown row={standardRow} />);

    expect(screen.getByText(/RB-001/)).toBeDefined();
    expect(screen.getByText(/100 × \$150\.00 = \$15,000\.00/)).toBeDefined();
    expect(screen.getByText(/Exchange rate: 0\.6500/)).toBeDefined();
    expect(screen.getByText(/\$15,000\.00 \/ 0\.6500 = A\$23,076\.92/)).toBeDefined();
  });

  it("renders 30-day rule indicator when applicable", () => {
    render(<EssIncomeDrilldown row={thirtyDayRow} />);

    expect(screen.getByText(/30-day rule applied/i)).toBeDefined();
    expect(screen.getByText(/Sold 10 days after vest/)).toBeDefined();
  });

  it("does not show 30-day text for standard vesting", () => {
    render(<EssIncomeDrilldown row={standardRow} />);

    expect(screen.queryByText(/30-day rule/i)).toBeNull();
  });
});
