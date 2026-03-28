import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProvider, useAppContext } from "./app-provider";
import { FakeStore } from "@/store/fake/fake.store";
import type { ForexService } from "@/services/forex.service";
import { aud, usd } from "@/types";

// Minimal forex stub — tests don't exercise conversion, just verify wiring
const stubForex: ForexService = {
  getRate: () => ({ rate: 0.75, rateDate: new Date() }),
  usdToAud: (amount) => ({ aud: aud(amount as number / 0.75), rate: 0.75, rateDate: new Date() }),
  audToUsd: (amount) => ({ usd: usd(amount as number * 0.75), rate: 0.75, rateDate: new Date() }),
  getDateRange: () => ({ earliest: new Date(), latest: new Date() }),
};

describe("AppProvider", () => {
  it("useAppContext throws when used outside provider", () => {
    function Naked() {
      useAppContext();
      return null;
    }
    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Naked />)).toThrow("AppProvider");
    spy.mockRestore();
  });

  it("provides store, forex, essIncome, and cgt services", () => {
    function Probe() {
      const ctx = useAppContext();
      return (
        <div>
          <span>{ctx.store ? "store:ok" : "store:missing"}</span>
          <span>{ctx.forex ? "forex:ok" : "forex:missing"}</span>
          <span>{ctx.essIncome ? "essIncome:ok" : "essIncome:missing"}</span>
          <span>{ctx.cgt ? "cgt:ok" : "cgt:missing"}</span>
        </div>
      );
    }
    render(
      <AppProvider store={new FakeStore()} forex={stubForex}>
        <Probe />
      </AppProvider>
    );
    expect(screen.getByText("store:ok")).toBeDefined();
    expect(screen.getByText("forex:ok")).toBeDefined();
    expect(screen.getByText("essIncome:ok")).toBeDefined();
    expect(screen.getByText("cgt:ok")).toBeDefined();
  });

  it("displayCurrency defaults to AUD", () => {
    function Probe() {
      const ctx = useAppContext();
      return <span>{ctx.displayCurrency}</span>;
    }
    render(
      <AppProvider store={new FakeStore()} forex={stubForex}>
        <Probe />
      </AppProvider>
    );
    expect(screen.getByText("AUD")).toBeDefined();
  });

  it("setDisplayCurrency updates the value", async () => {
    const user = userEvent.setup();
    function Probe() {
      const ctx = useAppContext();
      return (
        <div>
          <span data-testid="currency">{ctx.displayCurrency}</span>
          <button onClick={() => ctx.setDisplayCurrency("USD")}>switch</button>
        </div>
      );
    }
    render(
      <AppProvider store={new FakeStore()} forex={stubForex}>
        <Probe />
      </AppProvider>
    );
    expect(screen.getByTestId("currency").textContent).toBe("AUD");
    await user.click(screen.getByRole("button", { name: "switch" }));
    expect(screen.getByTestId("currency").textContent).toBe("USD");
  });

  it("refreshData increments refreshKey", async () => {
    const user = userEvent.setup();
    function Probe() {
      const ctx = useAppContext();
      return (
        <div>
          <span data-testid="key">{ctx.refreshKey}</span>
          <button onClick={ctx.refreshData}>refresh</button>
        </div>
      );
    }
    render(
      <AppProvider store={new FakeStore()} forex={stubForex}>
        <Probe />
      </AppProvider>
    );
    expect(screen.getByTestId("key").textContent).toBe("0");
    await user.click(screen.getByRole("button", { name: "refresh" }));
    expect(screen.getByTestId("key").textContent).toBe("1");
  });
});
