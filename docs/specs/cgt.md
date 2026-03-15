# Capital Gains Tax Calculation Specification

## Purpose

Calculate capital gains and losses for each share sale lot, applying AUD conversion at the correct dates, the 12-month CGT discount, and ATO-correct loss offsetting order.

## Scope

CGT calculations apply only to `SaleLot` records where `soldWithin30Days === false`. Lots where the 30-day rule applies have no separate CGT event (their value is captured as ESS income instead).

## Per-Lot CGT Formula

For each qualifying `SaleLot`:

### Step 1: Calculate Cost Basis in AUD

The cost basis is the market value of the shares at the original acquisition (vesting) date:

```
Cost Basis (USD) = costBasis                    // From Shareworks: sharesSold × costBasisPerShare
Cost Basis (AUD) = costBasis (USD) / audToUsd(originalAcquisitionDate)
```

### Step 2: Calculate Net Proceeds in AUD

Deduct brokerage and fees from sale proceeds:

```
Net Proceeds (USD) = saleProceeds - brokerageCommission - supplementalTransactionFee
Net Proceeds (AUD) = Net Proceeds (USD) / audToUsd(saleDate)
```

### Step 3: Calculate Capital Gain or Loss

```
Capital Gain/Loss (AUD) = Net Proceeds (AUD) - Cost Basis (AUD)
```

If positive: capital gain. If negative: capital loss.

### Step 4: Determine Discount Eligibility

```
holdingPeriod = saleDate - originalAcquisitionDate
isLongTerm = holdingPeriod > 365 days (12 months)
```

Note: The ATO requires shares to be held for **more than** 12 months. Exactly 12 months does not qualify.

## AUD Conversion Details

Two different exchange rates are used for each lot:

| Amount | Conversion Date | Rate Used |
|--------|----------------|-----------|
| Cost basis | `originalAcquisitionDate` | `audToUsd(originalAcquisitionDate)` |
| Net proceeds | `saleDate` | `audToUsd(saleDate)` |

This means currency movements between vesting and sale affect the AUD-denominated gain/loss independently of the share price movement.

## Per-Lot Result Structure

```typescript
interface SaleLotCgt {
  // Source data
  withdrawalRef: string;
  originatingReleaseRef: string;
  grantNumber: number;
  lotNumber: number;
  saleDate: Date;
  acquisitionDate: Date;

  // USD amounts
  costBasisUsd: USD;
  grossProceedsUsd: USD;
  brokerageUsd: USD;
  feesUsd: USD;
  netProceedsUsd: USD;
  sharesSold: number;

  // AUD conversion
  acquisitionForexRate: number;
  acquisitionForexDate: Date;     // Actual date used (may differ due to business day fallback)
  saleForexRate: number;
  saleForexDate: Date;

  // AUD amounts
  costBasisAud: AUD;
  netProceedsAud: AUD;
  capitalGainLossAud: AUD;       // Positive = gain, negative = loss

  // Discount eligibility
  holdingDays: number;
  isLongTerm: boolean;            // > 12 months
  isDiscountEligible: boolean;    // isLongTerm && capitalGainLossAud > 0

  // Financial year
  financialYear: string;
}
```

## Financial Year Aggregation and Discount Application

### Step 1: Group by Financial Year

Group all `SaleLotCgt` records by `financialYear` (based on `saleDate`).

### Step 2: Separate Gains and Losses

Within each FY:

```
shortTermGains = Σ capitalGainLossAud WHERE isLongTerm = false AND capitalGainLossAud > 0
longTermGains  = Σ capitalGainLossAud WHERE isLongTerm = true AND capitalGainLossAud > 0
capitalLosses  = |Σ capitalGainLossAud WHERE capitalGainLossAud < 0|  // Absolute value
```

### Step 3: Apply Losses (ATO Ordering)

The ATO requires capital losses to be offset against gains in a specific order:

1. **First**: Offset losses against short-term (non-discount) gains
2. **Then**: Offset remaining losses against long-term (discount-eligible) gains
3. Losses cannot create or increase a net loss beyond the actual losses

```
// Step 3a: Apply losses to short-term gains first
lossesRemaining = capitalLosses
shortTermAfterLosses = max(0, shortTermGains - lossesRemaining)
lossesRemaining = max(0, lossesRemaining - shortTermGains)

// Step 3b: Apply remaining losses to long-term gains
longTermAfterLosses = max(0, longTermGains - lossesRemaining)
lossesRemaining = max(0, lossesRemaining - longTermGains)
```

### Step 4: Apply 50% Discount

The 50% discount applies only to the long-term gains remaining after loss offsetting:

```
discountedLongTerm = longTermAfterLosses × 0.50
```

### Step 5: Calculate Net Capital Gain

```
netCapitalGain = shortTermAfterLosses + discountedLongTerm
```

If total losses exceed total gains, the excess is displayed as "net capital loss" for that FY but is **not** automatically carried forward (per design decision).

## Per-Financial-Year Summary

```typescript
interface FyCgtSummary {
  financialYear: string;
  lots: SaleLotCgt[];

  // Categorized gains
  shortTermGains: AUD;           // Sum of gains from lots held ≤ 12 months
  longTermGains: AUD;            // Sum of gains from lots held > 12 months
  totalGains: AUD;

  // Losses
  shortTermLosses: AUD;          // Sum of losses from short-term lots
  longTermLosses: AUD;           // Sum of losses from long-term lots
  totalLosses: AUD;

  // After loss offsetting
  shortTermAfterLosses: AUD;
  longTermAfterLosses: AUD;

  // After discount
  discountAmount: AUD;           // longTermAfterLosses × 0.50
  discountedLongTerm: AUD;       // longTermAfterLosses - discountAmount

  // Final
  netCapitalGain: AUD;           // shortTermAfterLosses + discountedLongTerm
  netCapitalLoss: AUD;           // Excess losses (if any), for display only
}
```

## Capital Loss Carry-Forward

Per design decision: losses are displayed per year but **not** automatically carried forward. The user manually accounts for prior-year losses when completing their tax return.

The UI displays each year's net position independently, with a note reminding the user to check prior-year losses.

## Golden Test Cases

### Test Case 1: Simple Long-Term Gain

**Input**:
- Sale lot from `WRC81521E07-1EE`, release `RB54549F21`, Grant 9375
- Sale date: 03-Aug-2021
- Acquisition date: 18-Feb-2019
- 30 shares, cost basis $104.90/share = $3,147.00
- Sale proceeds: $4,478.10 at $149.27/share
- Brokerage: $39.33, Fees: $0.39
- `soldWithin30Days = NO`

**Expected**:
- Holding period: ~2.5 years → long-term, discount eligible
- Net proceeds USD: $4,478.10 - $39.33 - $0.39 = $4,438.38
- Cost basis USD: $3,147.00
- Capital gain USD: $1,291.38
- AUD amounts depend on forex rates at 18-Feb-2019 and 03-Aug-2021 (pre-2023 data needed)
- FY: 2021-22

### Test Case 2: Capital Loss

**Input**:
- Sale lot from `WRC9F3CF137-1EE`, release `RB82856F04`, Grant 9375
- Sale date: 08-Nov-2022
- Acquisition date: 18-Aug-2021
- 30 shares, cost basis $337.73/share = $10,131.90
- Sale proceeds: $3,618.00 at $120.60/share
- Brokerage: $0.00, Fees: $0.13
- `soldWithin30Days = NO`

**Expected**:
- Holding period: ~14.7 months → long-term
- Net proceeds USD: $3,618.00 - $0.00 - $0.13 = $3,617.87
- Capital loss USD: $3,617.87 - $10,131.90 = -$6,514.03
- This is a loss, so no discount applies (discount only applies to gains)
- FY: 2022-23

### Test Case 3: Loss Offset Ordering (FY 2022-23 Aggregate)

The 08-Nov-2022 sale (`WRC9F3CF137-1EE`) contains many lots with significant losses (share price crashed from ~$200-$440 range to $120.60). Some lots from the same sale:

- Grant 9375, acq 18-May-2021 ($217.02): 29 shares, loss
- Grant 9375, acq 18-Aug-2021 ($337.73): 30 shares, loss
- Grant 9375, acq 18-Nov-2021 ($440.69): 30 shares, loss
- Grant 9375, acq 18-Feb-2021 ($256.73): 30 shares, loss

All are long-term (held > 12 months). If any short-term gains exist in FY 2022-23, losses should offset those first before offsetting long-term gains.

### Test Case 4: Short-Term Sale (Within 30 Days, Excluded from CGT)

**Input**:
- Sale lot from `WRCA4924415-1EE`, release `RBA3C416E9`, Grant 45088
- Sale date: 24-Feb-2023
- Acquisition date: 13-Feb-2023
- `soldWithin30Days = YES`

**Expected**:
- This lot is **excluded from CGT** entirely
- It is handled by the ESS income calculation instead
- CGT service should skip/filter this lot

### Test Case 5: Short-Term Sale (Outside 30 Days)

A lot held less than 12 months but sold after 30 days would be:
- Subject to CGT (not excluded by 30-day rule)
- Not eligible for 50% discount
- Gains are "short-term gains" in the FY aggregation

## Verification Invariants

1. Only lots with `soldWithin30Days === false` contribute to CGT
2. `capitalGainLossAud = netProceedsAud - costBasisAud` for every lot
3. Loss offsetting never creates a negative `shortTermAfterLosses` or `longTermAfterLosses`
4. `netCapitalGain = shortTermAfterLosses + (longTermAfterLosses × 0.50)` when gains exceed losses
5. The sum of per-lot gains minus per-lot losses should equal the pre-discount net position
6. Currency conversion uses two different rates per lot (acquisition date vs sale date)
7. Holding period calculation: `saleDate - acquisitionDate > 365` for discount eligibility

## Edge Cases

- **Same-day sale outside 30 days**: Possible if acquisition date differs from the release date of the *current* vest event (shares from an older vest). Hold period can still be > 12 months.
- **Tiny brokerage amounts**: Some lots show $0.00 brokerage and very small fees ($0.01-$0.13). These must still be deducted.
- **Multiple lots in one withdrawal**: A single `withdrawalReferenceNumber` can produce many `SaleLot` rows with different acquisition dates and holding periods. Each is calculated independently.
- **Forex rate difference**: The AUD gain/loss can differ significantly from the USD gain/loss due to AUD/USD movement between acquisition and sale dates.
