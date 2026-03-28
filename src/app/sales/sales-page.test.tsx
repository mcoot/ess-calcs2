import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SalesPage from "./page";
import { AppProvider } from "@/components/providers/app-provider";
import { FakeStore } from "@/store/fake/fake.store";
import { stubForex } from "@/test-helpers";
import { usd } from "@/types";
import { d } from "@/test-helpers";
import type { SaleLot } from "@/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const fy2122Lot: SaleLot = {
  withdrawalReferenceNumber: "WRC-2122",
  originatingReleaseRef: "RB-2122",
  grantNumber: 9375,
  grantName: "Test Grant",
  lotNumber: 1,
  saleType: "Long Shares",
  saleDate: d(2022, 3, 15), // FY 2021-22
  originalAcquisitionDate: d(2020, 2, 18),
  soldWithin30Days: false,
  costBasisPerShare: usd(100),
  costBasis: usd(1000),
  sharesSold: 10,
  saleProceeds: usd(2000),
  salePricePerShare: usd(200),
  brokerageCommission: usd(0),
  supplementalTransactionFee: usd(0),
};

const fy2223Lot: SaleLot = {
  withdrawalReferenceNumber: "WRC-2223",
  originatingReleaseRef: "RB-2223",
  grantNumber: 9375,
  grantName: "Test Grant",
  lotNumber: 1,
  saleType: "Long Shares",
  saleDate: d(2022, 10, 1), // FY 2022-23
  originalAcquisitionDate: d(2020, 2, 18),
  soldWithin30Days: false,
  costBasisPerShare: usd(100),
  costBasis: usd(2000),
  sharesSold: 20,
  saleProceeds: usd(4000),
  salePricePerShare: usd(200),
  brokerageCommission: usd(0),
  supplementalTransactionFee: usd(0),
};

async function renderPage(lots: SaleLot[]) {
  const store = new FakeStore();
  await store.saveSaleLots(lots);
  return render(
    <AppProvider store={store} forex={stubForex}>
      <SalesPage />
    </AppProvider>,
  );
}

describe("SalesPage FY filtering", () => {
  it("shows all lots by default", async () => {
    await renderPage([fy2122Lot, fy2223Lot]);

    await waitFor(() => {
      expect(screen.getByText("WRC-2122")).toBeDefined();
      expect(screen.getByText("WRC-2223")).toBeDefined();
    });
  });

  it("filters out lots from other FYs when a specific FY is selected", async () => {
    const user = userEvent.setup();
    await renderPage([fy2122Lot, fy2223Lot]);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("WRC-2122")).toBeDefined();
    });

    // Select FY 2022-23
    await user.click(screen.getByRole("button", { name: "2022-23" }));

    // FY 2022-23 lot should remain
    expect(screen.getByText("WRC-2223")).toBeDefined();
    // FY 2021-22 lot should be gone entirely (not just missing CGT data)
    expect(screen.queryByText("WRC-2122")).toBeNull();
  });

  it("shows all lots again when 'All' is selected after filtering", async () => {
    const user = userEvent.setup();
    await renderPage([fy2122Lot, fy2223Lot]);

    await waitFor(() => {
      expect(screen.getByText("WRC-2122")).toBeDefined();
    });

    // Filter to one FY
    await user.click(screen.getByRole("button", { name: "2021-22" }));
    expect(screen.queryByText("WRC-2223")).toBeNull();

    // Back to all
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("WRC-2122")).toBeDefined();
    expect(screen.getByText("WRC-2223")).toBeDefined();
  });
});
