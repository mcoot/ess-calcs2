import { describe, it, expect } from "vitest";
import {
  AwardSchema,
  VestingScheduleEntrySchema,
  RsuReleaseSchema,
  SaleLotSchema,
  ForexRateSchema,
  AppConfigSchema,
} from "./schemas";

// ── Helpers ──────────────────────────────────────────────────────────

function validAward() {
  return {
    grantDate: new Date("2023-01-15"),
    grantNumber: 1,
    grantType: "RSU",
    grantName: "Grant A",
    grantReason: "Annual",
    conversionPrice: 150.0,
    sharesGranted: 100,
  };
}

function validVestingEntry() {
  return {
    grantNumber: 1,
    vestDate: new Date("2023-06-15"),
    shares: 100,
  };
}

function validRsuRelease() {
  return {
    grantDate: new Date("2023-01-15"),
    grantNumber: 1,
    grantName: "Grant A",
    grantReason: "Annual",
    releaseDate: new Date("2024-01-15"),
    sharesVested: 50,
    sharesSoldToCover: 20,
    sharesHeld: 30,
    valueUsd: 5000,
    fmvPerShare: 100,
    saleDateSellToCover: new Date("2024-01-15"),
    salePricePerShare: 101,
    saleProceeds: 2020,
    sellToCoverAmount: 2000,
    releaseReferenceNumber: "REL-001",
  };
}

function validSaleLot() {
  return {
    withdrawalReferenceNumber: "WD-001",
    originatingReleaseRef: "REL-001",
    grantNumber: 1,
    grantName: "Grant A",
    lotNumber: 1,
    saleType: "Market Sale",
    saleDate: new Date("2024-06-01"),
    originalAcquisitionDate: new Date("2024-01-15"),
    soldWithin30Days: false,
    costBasisPerShare: 100,
    costBasis: 5000,
    sharesSold: 50,
    saleProceeds: 6000,
    salePricePerShare: 120,
    brokerageCommission: 10,
    supplementalTransactionFee: 5,
  };
}

function validForexRate() {
  return {
    date: new Date("2023-01-03"),
    audToUsd: 0.6828,
  };
}

function validAppConfig() {
  return {
    displayCurrency: "AUD" as const,
  };
}

// ── Award ────────────────────────────────────────────────────────────

describe("AwardSchema", () => {
  it("parses a valid award with branded USD conversionPrice", () => {
    const result = AwardSchema.safeParse(validAward());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conversionPrice).toBe(150.0);
      expect(result.data.sharesGranted).toBe(100);
    }
  });

  it("fails when grantName is missing", () => {
    const { grantName, ...rest } = validAward();
    expect(AwardSchema.safeParse(rest).success).toBe(false);
  });

  it("fails when sharesGranted is a string", () => {
    expect(
      AwardSchema.safeParse({ ...validAward(), sharesGranted: "ten" }).success
    ).toBe(false);
  });

  it("fails when grantNumber is 0", () => {
    expect(
      AwardSchema.safeParse({ ...validAward(), grantNumber: 0 }).success
    ).toBe(false);
  });

  it("fails when grantNumber is negative", () => {
    expect(
      AwardSchema.safeParse({ ...validAward(), grantNumber: -1 }).success
    ).toBe(false);
  });

  it("fails when grantNumber is non-integer", () => {
    expect(
      AwardSchema.safeParse({ ...validAward(), grantNumber: 1.5 }).success
    ).toBe(false);
  });

  it("fails when grantType is empty", () => {
    expect(
      AwardSchema.safeParse({ ...validAward(), grantType: "" }).success
    ).toBe(false);
  });

  it("fails when grantName is empty", () => {
    expect(
      AwardSchema.safeParse({ ...validAward(), grantName: "" }).success
    ).toBe(false);
  });

  it("fails when grantReason is empty", () => {
    expect(
      AwardSchema.safeParse({ ...validAward(), grantReason: "" }).success
    ).toBe(false);
  });

  it("allows conversionPrice of zero", () => {
    expect(
      AwardSchema.safeParse({ ...validAward(), conversionPrice: 0 }).success
    ).toBe(true);
  });

  it("fails when conversionPrice is negative", () => {
    expect(
      AwardSchema.safeParse({ ...validAward(), conversionPrice: -1 }).success
    ).toBe(false);
  });

  it("fails when sharesGranted is 0", () => {
    expect(
      AwardSchema.safeParse({ ...validAward(), sharesGranted: 0 }).success
    ).toBe(false);
  });

  it("fails when sharesGranted is non-integer", () => {
    expect(
      AwardSchema.safeParse({ ...validAward(), sharesGranted: 10.5 }).success
    ).toBe(false);
  });
});

// ── VestingScheduleEntry ─────────────────────────────────────────────

describe("VestingScheduleEntrySchema", () => {
  it("parses a valid entry", () => {
    const result = VestingScheduleEntrySchema.safeParse(validVestingEntry());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shares).toBe(100);
    }
  });

  it("fails when grantNumber is 0", () => {
    expect(
      VestingScheduleEntrySchema.safeParse({
        ...validVestingEntry(),
        grantNumber: 0,
      }).success
    ).toBe(false);
  });

  it("fails when shares is 0", () => {
    expect(
      VestingScheduleEntrySchema.safeParse({
        ...validVestingEntry(),
        shares: 0,
      }).success
    ).toBe(false);
  });

  it("fails when shares is non-integer", () => {
    expect(
      VestingScheduleEntrySchema.safeParse({
        ...validVestingEntry(),
        shares: 50.5,
      }).success
    ).toBe(false);
  });
});

// ── RsuRelease ───────────────────────────────────────────────────────

describe("RsuReleaseSchema", () => {
  it("parses a valid release with all fields including optionals", () => {
    const result = RsuReleaseSchema.safeParse(validRsuRelease());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.valueUsd).toBe(5000);
      expect(result.data.fmvPerShare).toBe(100);
    }
  });

  it("parses a valid release with optionals omitted", () => {
    const { saleDateSellToCover, salePricePerShare, saleProceeds, ...rest } =
      validRsuRelease();
    const result = RsuReleaseSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("fails when grantNumber is 0", () => {
    expect(
      RsuReleaseSchema.safeParse({ ...validRsuRelease(), grantNumber: 0 })
        .success
    ).toBe(false);
  });

  it("fails when grantName is empty", () => {
    expect(
      RsuReleaseSchema.safeParse({ ...validRsuRelease(), grantName: "" })
        .success
    ).toBe(false);
  });

  it("fails when grantReason is empty", () => {
    expect(
      RsuReleaseSchema.safeParse({ ...validRsuRelease(), grantReason: "" })
        .success
    ).toBe(false);
  });

  it("fails when sharesVested is 0", () => {
    expect(
      RsuReleaseSchema.safeParse({ ...validRsuRelease(), sharesVested: 0 })
        .success
    ).toBe(false);
  });

  it("allows sharesSoldToCover of 0", () => {
    expect(
      RsuReleaseSchema.safeParse({
        ...validRsuRelease(),
        sharesSoldToCover: 0,
      }).success
    ).toBe(true);
  });

  it("fails when sharesSoldToCover is negative", () => {
    expect(
      RsuReleaseSchema.safeParse({
        ...validRsuRelease(),
        sharesSoldToCover: -1,
      }).success
    ).toBe(false);
  });

  it("fails when sharesSoldToCover is non-integer", () => {
    expect(
      RsuReleaseSchema.safeParse({
        ...validRsuRelease(),
        sharesSoldToCover: 1.5,
      }).success
    ).toBe(false);
  });

  it("allows sharesHeld of 0", () => {
    expect(
      RsuReleaseSchema.safeParse({ ...validRsuRelease(), sharesHeld: 0 })
        .success
    ).toBe(true);
  });

  it("fails when sharesHeld is negative", () => {
    expect(
      RsuReleaseSchema.safeParse({ ...validRsuRelease(), sharesHeld: -1 })
        .success
    ).toBe(false);
  });

  it("fails when valueUsd is 0", () => {
    expect(
      RsuReleaseSchema.safeParse({ ...validRsuRelease(), valueUsd: 0 }).success
    ).toBe(false);
  });

  it("fails when fmvPerShare is 0", () => {
    expect(
      RsuReleaseSchema.safeParse({ ...validRsuRelease(), fmvPerShare: 0 })
        .success
    ).toBe(false);
  });

  it("allows sellToCoverAmount of 0", () => {
    expect(
      RsuReleaseSchema.safeParse({
        ...validRsuRelease(),
        sellToCoverAmount: 0,
      }).success
    ).toBe(true);
  });

  it("fails when sellToCoverAmount is negative", () => {
    expect(
      RsuReleaseSchema.safeParse({
        ...validRsuRelease(),
        sellToCoverAmount: -1,
      }).success
    ).toBe(false);
  });

  it("fails when releaseReferenceNumber is empty", () => {
    expect(
      RsuReleaseSchema.safeParse({
        ...validRsuRelease(),
        releaseReferenceNumber: "",
      }).success
    ).toBe(false);
  });
});

// ── SaleLot ──────────────────────────────────────────────────────────

describe("SaleLotSchema", () => {
  it("parses a valid sale lot with branded USD fields", () => {
    const result = SaleLotSchema.safeParse(validSaleLot());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.costBasis).toBe(5000);
      expect(result.data.saleProceeds).toBe(6000);
    }
  });

  it("fails when withdrawalReferenceNumber is empty", () => {
    expect(
      SaleLotSchema.safeParse({
        ...validSaleLot(),
        withdrawalReferenceNumber: "",
      }).success
    ).toBe(false);
  });

  it("fails when originatingReleaseRef is empty", () => {
    expect(
      SaleLotSchema.safeParse({
        ...validSaleLot(),
        originatingReleaseRef: "",
      }).success
    ).toBe(false);
  });

  it("fails when grantNumber is 0", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), grantNumber: 0 }).success
    ).toBe(false);
  });

  it("fails when grantName is empty", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), grantName: "" }).success
    ).toBe(false);
  });

  it("fails when lotNumber is 0", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), lotNumber: 0 }).success
    ).toBe(false);
  });

  it("fails when saleType is empty", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), saleType: "" }).success
    ).toBe(false);
  });

  it("allows costBasisPerShare of 0", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), costBasisPerShare: 0 })
        .success
    ).toBe(true);
  });

  it("fails when costBasisPerShare is negative", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), costBasisPerShare: -1 })
        .success
    ).toBe(false);
  });

  it("allows costBasis of 0", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), costBasis: 0 }).success
    ).toBe(true);
  });

  it("fails when costBasis is negative", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), costBasis: -1 }).success
    ).toBe(false);
  });

  it("fails when sharesSold is 0", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), sharesSold: 0 }).success
    ).toBe(false);
  });

  it("fails when sharesSold is non-integer", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), sharesSold: 5.5 }).success
    ).toBe(false);
  });

  it("allows saleProceeds of 0", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), saleProceeds: 0 }).success
    ).toBe(true);
  });

  it("fails when saleProceeds is negative", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), saleProceeds: -1 }).success
    ).toBe(false);
  });

  it("fails when salePricePerShare is 0", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), salePricePerShare: 0 })
        .success
    ).toBe(false);
  });

  it("allows brokerageCommission of 0", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), brokerageCommission: 0 })
        .success
    ).toBe(true);
  });

  it("fails when brokerageCommission is negative", () => {
    expect(
      SaleLotSchema.safeParse({ ...validSaleLot(), brokerageCommission: -1 })
        .success
    ).toBe(false);
  });

  it("allows supplementalTransactionFee of 0", () => {
    expect(
      SaleLotSchema.safeParse({
        ...validSaleLot(),
        supplementalTransactionFee: 0,
      }).success
    ).toBe(true);
  });

  it("fails when supplementalTransactionFee is negative", () => {
    expect(
      SaleLotSchema.safeParse({
        ...validSaleLot(),
        supplementalTransactionFee: -1,
      }).success
    ).toBe(false);
  });
});

// ── ForexRate ────────────────────────────────────────────────────────

describe("ForexRateSchema", () => {
  it("parses a valid forex rate", () => {
    const result = ForexRateSchema.safeParse(validForexRate());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audToUsd).toBe(0.6828);
    }
  });

  it("fails when audToUsd is 0", () => {
    expect(
      ForexRateSchema.safeParse({ ...validForexRate(), audToUsd: 0 }).success
    ).toBe(false);
  });

  it("fails when audToUsd is negative", () => {
    expect(
      ForexRateSchema.safeParse({ ...validForexRate(), audToUsd: -0.5 })
        .success
    ).toBe(false);
  });
});

// ── AppConfig ────────────────────────────────────────────────────────

describe("AppConfigSchema", () => {
  it("parses a valid minimal config", () => {
    const result = AppConfigSchema.safeParse(validAppConfig());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayCurrency).toBe("AUD");
      expect(result.data.lastImportDate).toBeUndefined();
      expect(result.data.importedFileTypes).toBeUndefined();
    }
  });

  it("parses a valid config with all fields", () => {
    const result = AppConfigSchema.safeParse({
      displayCurrency: "USD",
      lastImportDate: "2024-01-01",
      importedFileTypes: ["awards", "releases"],
    });
    expect(result.success).toBe(true);
  });

  it("fails when displayCurrency is invalid", () => {
    expect(
      AppConfigSchema.safeParse({ displayCurrency: "EUR" }).success
    ).toBe(false);
  });

  it("fails when importedFileTypes contains invalid entry", () => {
    expect(
      AppConfigSchema.safeParse({
        displayCurrency: "AUD",
        importedFileTypes: ["awards", "invalid"],
      }).success
    ).toBe(false);
  });
});
