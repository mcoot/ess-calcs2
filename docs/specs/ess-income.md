# ESS Income Calculation Specification

## Purpose

Calculate Australian taxable income from RSU vesting events under Employee Share Scheme rules, including correct application of the 30-day rule at per-lot granularity.

## Background

Under Australian tax law (Division 83A ITAA 1997), RSUs are tax-deferred ESS interests. The "deferred taxing point" is typically the vesting date. At the taxing point, the market value of shares is included in assessable income (since RSU cost base is effectively $0).

The 30-day rule modifies the taxing point when shares are disposed of within 30 days of vesting.

## ESS Income Formula

### Standard Case (no 30-day rule)

For each `RsuRelease`:

```
ESS Income (USD) = sharesVested × fmvPerShare
ESS Income (AUD) = ESS Income (USD) / audToUsd(releaseDate)
```

The taxing point is the `releaseDate`. The amount is reported in the financial year containing the release date.

### Financial Year Assignment

Australian financial years run 1 July to 30 June.

```
If releaseDate is between 1-Jul-YYYY and 30-Jun-(YYYY+1):
  → FY is "YYYY-(YYYY+1)", e.g. "2024-25"
```

Examples:
- Release date 18-Feb-2024 → FY 2023-24
- Release date 13-Aug-2024 → FY 2024-25

## 30-Day Rule

### When It Applies

The 30-day rule applies to a `SaleLot` when `soldWithin30Days === true`. This means the shares in that lot were sold within 30 calendar days of their vesting date (`originalAcquisitionDate`).

Shareworks pre-computes this flag, so we use it directly rather than recalculating.

### Effect on ESS Income

When the 30-day rule applies to a sale lot:

1. **Taxing point shifts** from the vest date to the sale date
2. **ESS income for that lot** = sale proceeds (the market value at disposal)
3. **No separate CGT event** occurs for that lot

```
ESS Income for 30-day lot (USD) = saleProceeds
ESS Income for 30-day lot (AUD) = saleProceeds (USD) / audToUsd(saleDate)
```

The financial year assignment uses the **sale date**, not the vest date.

### Per-Lot Granularity

A single `RsuRelease` can have mixed treatment:

- Some `SaleLot` records referencing this release have `soldWithin30Days === true`
- Others have `soldWithin30Days === false` (or don't exist yet if shares are unsold)

The ESS income for the release is split:

```
Total ESS Income for Release =
  Σ (30-day lots: saleProceeds converted at sale date) +
  (remaining shares × fmvPerShare converted at vest date)
```

Where "remaining shares" = shares not covered by any 30-day sale lot.

### Calculating Remaining Shares

For a release with `sharesVested = N`:

```
shares_in_30day_lots = Σ saleLot.sharesSold WHERE saleLot.originatingReleaseRef = release.releaseReferenceNumber AND saleLot.soldWithin30Days = true

remaining_shares = N - shares_in_30day_lots
```

The standard ESS income formula applies to `remaining_shares` at the vest date rate.

### Mixed Release Example

Consider release `RBB2123641` (Grant 68889, 13-Nov-2023, 58 shares at $175.04/share):

Looking at the sales data, this release has:
- Lot in sale `WRCB2236701-1EE` on 15-Nov-2023: 58 shares, `soldWithin30Days = YES`, proceeds $10,800.18

All 58 shares are covered by a 30-day lot. ESS income = $10,800.18 USD converted at the 15-Nov-2023 rate.

Now consider a case where only some shares from a release are sold within 30 days. Suppose a release of 34 shares where 17 are sold within 30 days:
- 17 shares: ESS income = sale proceeds, converted at sale date
- 17 shares: ESS income = 17 × fmvPerShare, converted at vest date

## Aggregation

### Per-Release Summary

```typescript
interface ReleaseEssIncome {
  releaseRef: string;
  grantNumber: number;
  releaseDate: Date;
  sharesVested: number;
  fmvPerShare: USD;

  // Standard portion (not sold within 30 days)
  standardShares: number;
  standardIncomeUsd: USD;
  standardIncomeAud: AUD;
  standardForexRate: number;
  standardForexDate: Date;        // releaseDate or nearest prior business day

  // 30-day rule portions
  thirtyDayLots: ThirtyDayLotIncome[];

  // Totals
  totalEssIncomeAud: AUD;
  financialYear: string;          // e.g. "2024-25"
}

interface ThirtyDayLotIncome {
  saleLotRef: string;             // withdrawalReferenceNumber
  saleDate: Date;
  sharesSold: number;
  saleProceedsUsd: USD;
  essIncomeAud: AUD;
  forexRate: number;
  forexDate: Date;                // saleDate or nearest prior business day
  financialYear: string;          // Based on sale date
}
```

### Per-Financial-Year Summary

```typescript
interface FyEssIncome {
  financialYear: string;          // e.g. "2024-25"
  startDate: Date;                // 1-Jul
  endDate: Date;                  // 30-Jun
  releases: ReleaseEssIncome[];
  totalEssIncomeAud: AUD;
}
```

Note: When 30-day rule shifts a lot's taxing point across a financial year boundary (vest in June, sold in July), the lot's ESS income is reported in the financial year of the **sale date**.

## Audit Trail

Every ESS income value must be traceable to:
- The source release (reference number, date, shares, FMV)
- Whether 30-day rule was applied, and for which lots
- The exchange rate used and the date it was looked up for
- The formula applied

This data is captured in the `ReleaseEssIncome` structure above.

## Golden Test Cases

### Test Case 1: Simple Release (No 30-Day Rule)

**Input**:
- Release `RB6538C8B1`: 30 shares vested on 18-Feb-2020 at $153.88/share
- No sale lots with `soldWithin30Days = true` for this release

**Expected**:
- ESS Income (USD) = 30 × $153.88 = $4,616.40
- Forex rate on 18-Feb-2020: requires pre-2023 RBA data (flag as needing rate)
- Financial Year: 2019-20

### Test Case 2: Full 30-Day Rule Application

**Input**:
- Release `RBA3C416E9`: 57 shares vested on 13-Feb-2023 at $175.56/share (Grant 45088)
- Sale lot in `WRCA4924415-1EE` on 24-Feb-2023: 26 shares sold, `soldWithin30Days = YES`, proceeds $4,271.54
- Sale lot in `WRCB2236701-1EE` on 15-Nov-2023: 31 shares sold, `soldWithin30Days = NO`

**Expected**:
- 30-day shares: 26
- Standard shares: 57 - 26 = 31
- 30-day ESS income (USD): $4,271.54, convert at 24-Feb-2023 rate
- Standard ESS income (USD): 31 × $175.56 = $5,442.36, convert at 13-Feb-2023 rate
- Both portions in FY 2022-23

### Test Case 3: Multiple 30-Day Lots from One Release

**Input**:
- Release `RBCE48ED40` (Grant 83105): 95 shares vested on 13-May-2025 at $229.52/share
- Multiple sale lots all with `soldWithin30Days = YES`:
  - 16-May-2025: 45 shares, proceeds $9,931.50
  - 21-May-2025: 5 shares, proceeds $1,074.75
  - 27-May-2025: 11 shares, proceeds $2,304.61
  - 29-May-2025: 33 shares, proceeds $7,111.50
  - 05-Jun-2025: 1 share, proceeds $211.84

**Expected**:
- Total 30-day shares: 45 + 5 + 11 + 33 + 1 = 95 (all shares accounted for)
- Standard shares: 0
- ESS income: sum of each lot's proceeds converted at each lot's sale date rate
- All lots in FY 2024-25

### Test Case 4: Cross-FY Boundary (if applicable)

If a release vests on 28-Jun and a lot is sold on 3-Jul (within 30 days):
- Standard portion: FY based on vest date (Jun → current FY)
- 30-day lot: FY based on sale date (Jul → next FY)

## Verification Invariants

1. For every release: `standardShares + Σ thirtyDayLots.sharesSold ≤ sharesVested`
2. Total ESS income across all releases should be reconcilable with Award Summary benefit amounts (approximate, as timing differs)
3. No double-counting: shares in 30-day lots must not also contribute to standard ESS income
4. Financial year assignment must use the correct taxing point date (vest date for standard, sale date for 30-day)
