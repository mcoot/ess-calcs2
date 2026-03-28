import { describe, it, expect, beforeEach } from "vitest";
import { FakeStore } from "./fake.store";
import type { Award, VestingScheduleEntry, RsuRelease, SaleLot, ForexRate } from "@/types";
import { usd } from "@/types";
import { d } from "@/test-helpers";

const award: Award = {
  grantDate: d(2018, 2, 15),
  grantNumber: 9375,
  grantType: "Share Units (RSU)",
  grantName: "Test Grant",
  grantReason: "New Hire",
  conversionPrice: usd(52.65),
  sharesGranted: 475,
};

const vestingEntry: VestingScheduleEntry = {
  grantNumber: 9375,
  vestDate: d(2019, 2, 18),
  shares: 118,
};

const release: RsuRelease = {
  grantDate: d(2018, 2, 15),
  grantNumber: 9375,
  grantName: "Test Grant",
  grantReason: "New Hire",
  releaseDate: d(2020, 2, 18),
  sharesVested: 30,
  sharesSoldToCover: 0,
  sharesHeld: 30,
  valueUsd: usd(4616.4),
  fmvPerShare: usd(153.88),
  sellToCoverAmount: usd(0),
  releaseReferenceNumber: "RB6538C8B1",
};

const saleLot: SaleLot = {
  withdrawalReferenceNumber: "WRC123",
  originatingReleaseRef: "RB6538C8B1",
  grantNumber: 9375,
  grantName: "Test Grant",
  lotNumber: 1,
  saleType: "Long Shares",
  saleDate: d(2020, 1, 29),
  originalAcquisitionDate: d(2019, 2, 18),
  soldWithin30Days: false,
  costBasisPerShare: usd(104.9),
  costBasis: usd(3147),
  sharesSold: 30,
  saleProceeds: usd(4478.1),
  salePricePerShare: usd(149.27),
  brokerageCommission: usd(39.33),
  supplementalTransactionFee: usd(0.39),
};

const forexRate: ForexRate = {
  date: d(2023, 1, 3),
  audToUsd: 0.6828,
};

describe("FakeStore", () => {
  let store: FakeStore;

  beforeEach(() => {
    store = new FakeStore();
  });

  it("initially returns empty arrays and null config", async () => {
    expect(await store.getAwards()).toEqual([]);
    expect(await store.getVestingSchedule()).toEqual([]);
    expect(await store.getRsuReleases()).toEqual([]);
    expect(await store.getSaleLots()).toEqual([]);
    expect(await store.getForexRates()).toEqual([]);
    expect(await store.getConfig()).toBeNull();
  });

  it("round-trips awards", async () => {
    await store.saveAwards([award]);
    expect(await store.getAwards()).toEqual([award]);
  });

  it("round-trips all other data types", async () => {
    await store.saveVestingSchedule([vestingEntry]);
    expect(await store.getVestingSchedule()).toEqual([vestingEntry]);

    await store.saveRsuReleases([release]);
    expect(await store.getRsuReleases()).toEqual([release]);

    await store.saveSaleLots([saleLot]);
    expect(await store.getSaleLots()).toEqual([saleLot]);

    await store.saveForexRates([forexRate]);
    expect(await store.getForexRates()).toEqual([forexRate]);

    await store.saveConfig({ displayCurrency: "AUD" });
    expect(await store.getConfig()).toEqual({ displayCurrency: "AUD" });
  });

  it("clearAll resets everything", async () => {
    await store.saveAwards([award]);
    await store.saveVestingSchedule([vestingEntry]);
    await store.saveRsuReleases([release]);
    await store.saveSaleLots([saleLot]);
    await store.saveForexRates([forexRate]);
    await store.saveConfig({ displayCurrency: "USD" });

    await store.clearAll();

    expect(await store.getAwards()).toEqual([]);
    expect(await store.getVestingSchedule()).toEqual([]);
    expect(await store.getRsuReleases()).toEqual([]);
    expect(await store.getSaleLots()).toEqual([]);
    expect(await store.getForexRates()).toEqual([]);
    expect(await store.getConfig()).toBeNull();
  });
});
