import { describe, it, expect } from "vitest";
import { createReconciliationService } from "./reconciliation.service";
import type { Award, RsuRelease, SaleLot } from "@/types";
import { usd } from "@/types";
import { d } from "@/test-helpers";

// ── Test helpers ────────────────────────────────────────────────────

function makeAward(overrides?: Partial<Award>): Award {
  return {
    grantDate: d(2020, 1, 15),
    grantNumber: 9375,
    grantType: "Share Units (RSU)",
    grantName: "Test Grant",
    grantReason: "New Hire",
    conversionPrice: usd(0),
    sharesGranted: 100,
    ...overrides,
  };
}

function makeRelease(overrides?: Partial<RsuRelease>): RsuRelease {
  return {
    grantDate: d(2020, 1, 15),
    grantNumber: 9375,
    grantName: "Test Grant",
    grantReason: "New Hire",
    releaseDate: d(2021, 1, 15),
    sharesVested: 30,
    sharesSoldToCover: 10,
    sharesHeld: 20,
    valueUsd: usd(4500),
    fmvPerShare: usd(150),
    sellToCoverAmount: usd(1500),
    releaseReferenceNumber: "RB1",
    ...overrides,
  };
}

function makeSaleLot(overrides?: Partial<SaleLot>): SaleLot {
  return {
    withdrawalReferenceNumber: "WRC1",
    originatingReleaseRef: "RB1",
    grantNumber: 9375,
    grantName: "Test Grant",
    lotNumber: 1,
    saleType: "Long Shares",
    saleDate: d(2022, 6, 15),
    originalAcquisitionDate: d(2021, 1, 15),
    soldWithin30Days: false,
    costBasisPerShare: usd(150),
    costBasis: usd(750),
    sharesSold: 5,
    saleProceeds: usd(900),
    salePricePerShare: usd(180),
    brokerageCommission: usd(0),
    supplementalTransactionFee: usd(0.05),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe("ReconciliationService", () => {
  const service = createReconciliationService();

  it("returns no warnings when data is consistent", () => {
    const awards = [makeAward({ sharesGranted: 100 })];
    const releases = [makeRelease({ sharesVested: 100, releaseReferenceNumber: "RB1" })];
    const saleLots = [makeSaleLot({ originatingReleaseRef: "RB1", sharesSold: 50 })];

    const warnings = service.validate(awards, releases, saleLots);

    expect(warnings).toEqual([]);
  });

  it("warns on share count mismatch between awards and releases", () => {
    const awards = [makeAward({ grantNumber: 9375, sharesGranted: 100 })];
    const releases = [
      makeRelease({ grantNumber: 9375, sharesVested: 40, releaseReferenceNumber: "RB1" }),
      makeRelease({ grantNumber: 9375, sharesVested: 30, releaseReferenceNumber: "RB2" }),
    ];

    const warnings = service.validate(awards, releases, []);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      severity: "warning",
      category: "share-count",
    });
    expect(warnings[0].message).toContain("9375");
  });

  it("errors on orphan sale lot referencing non-existent release", () => {
    const releases = [makeRelease({ releaseReferenceNumber: "RB1" })];
    const saleLots = [makeSaleLot({ originatingReleaseRef: "RB-GHOST" })];

    const warnings = service.validate([], releases, saleLots);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      severity: "error",
      category: "orphan-ref",
    });
    expect(warnings[0].message).toContain("RB-GHOST");
  });

  it("warns when shares sold exceed shares vested for a release", () => {
    const releases = [makeRelease({ releaseReferenceNumber: "RB1", sharesVested: 30 })];
    const saleLots = [
      makeSaleLot({ originatingReleaseRef: "RB1", sharesSold: 20 }),
      makeSaleLot({ originatingReleaseRef: "RB1", sharesSold: 20, lotNumber: 2 }),
    ];

    const warnings = service.validate([], releases, saleLots);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      severity: "warning",
      category: "oversold",
    });
    expect(warnings[0].message).toContain("RB1");
  });

  it("returns multiple warnings from different rules", () => {
    const awards = [makeAward({ grantNumber: 9375, sharesGranted: 100 })];
    const releases = [makeRelease({ grantNumber: 9375, sharesVested: 50, releaseReferenceNumber: "RB1" })];
    const saleLots = [makeSaleLot({ originatingReleaseRef: "RB-GHOST" })];

    const warnings = service.validate(awards, releases, saleLots);

    const categories = warnings.map((w) => w.category);
    expect(categories).toContain("share-count");
    expect(categories).toContain("orphan-ref");
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });
});
