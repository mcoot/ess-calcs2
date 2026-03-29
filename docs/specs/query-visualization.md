# Query & Visualization Interface Specification

## Purpose

Provide a dashboard, list views, charts, and drill-down audit trails for exploring ESS income and CGT data. Support a global USD/AUD display toggle and time-range filtering.

## Dashboard

### Summary Cards

The dashboard landing page shows high-level metrics:

| Card                 | Value                          | Subtitle                           |
| -------------------- | ------------------------------ | ---------------------------------- |
| Total ESS Income     | AUD sum across all years       | "Assessable ESS discount income"   |
| Total Capital Gains  | AUD net gains (after discount) | "Net capital gains after discount" |
| Total Capital Losses | AUD total losses               | "Unapplied capital losses"         |
| Awards               | Count of active grants         | "RSU grants"                       |
| Shares Vested        | Total shares released          | "Across all grants"                |
| Shares Sold          | Total shares in sale lots      | "Long shares sold"                 |

Cards show AUD or USD based on the global toggle. For computed tax values (ESS income, CGT), AUD is always the primary display with USD shown as secondary when in AUD mode.

### Financial Year Selector

- Dropdown or tab bar to filter dashboard to a specific FY
- Default: "All years" showing cumulative totals
- Available FYs derived from the data (earliest release/sale to latest)

## List Views

### Awards List

| Column           | Source                         |
| ---------------- | ------------------------------ |
| Grant Number     | `Award.grantNumber`            |
| Grant Date       | `Award.grantDate`              |
| Grant Name       | `Award.grantName`              |
| Reason           | `Award.grantReason`            |
| Shares Granted   | `Award.sharesGranted`          |
| Shares Vested    | Sum of releases for this grant |
| Shares Remaining | Granted - Vested               |

Click a row to expand: shows linked vesting schedule entries and releases.

### Releases List

| Column        | Source                                                   |
| ------------- | -------------------------------------------------------- |
| Release Date  | `RsuRelease.releaseDate`                                 |
| Grant         | `grantNumber` + `grantName`                              |
| Shares Vested | `sharesVested`                                           |
| FMV/Share     | `fmvPerShare`                                            |
| Value         | `valueUsd` (with AUD conversion)                         |
| ESS Income    | Calculated AUD ESS income                                |
| 30-Day Lots   | Count of linked sale lots with `soldWithin30Days = true` |
| FY            | Financial year                                           |

Click a row to expand: shows ESS income calculation breakdown and linked sale lots.

### Sales List

| Column           | Source                      |
| ---------------- | --------------------------- |
| Sale Date        | `SaleLot.saleDate`          |
| Grant            | `grantNumber` + `grantName` |
| Shares           | `sharesSold`                |
| Acquisition Date | `originalAcquisitionDate`   |
| Holding Period   | Calculated days             |
| Cost Basis       | `costBasis` (with AUD)      |
| Proceeds         | `saleProceeds` (with AUD)   |
| Gain/Loss        | Calculated AUD CGT          |
| 30-Day Rule      | `soldWithin30Days` badge    |
| FY               | Financial year              |

Click a row to expand: shows full CGT calculation breakdown with both forex rates.

## Time-Range Filtering

### Financial Year Filter

- Quick-select buttons for each FY present in the data
- "All" option to show everything
- Affects all list views and dashboard cards

### Custom Date Range

- Start date and end date pickers
- Filters by the relevant date for each view:
  - Releases: `releaseDate`
  - Sales: `saleDate`
  - Awards: always shown (not date-filtered)

## Charts

Built with Recharts. All charts respect the global currency toggle and time-range filter.

### Chart 1: Vest Value Over Time

- **Type**: Bar chart
- **X-axis**: Release date (grouped by quarter or month)
- **Y-axis**: Value at vesting (USD or AUD)
- **Color**: By grant (each grant a different color)
- **Interaction**: Hover shows release details

### Chart 2: Share Price at Vest

- **Type**: Line chart
- **X-axis**: Release date
- **Y-axis**: FMV per share (USD)
- **Data points**: One per release
- **Annotation**: Grant number labels on hover

### Chart 3: ESS Income by Financial Year

- **Type**: Stacked bar chart
- **X-axis**: Financial year
- **Y-axis**: ESS income (AUD)
- **Stacks**: Standard income vs 30-day rule income
- **Interaction**: Click bar to navigate to that FY's release list

### Chart 4: Capital Gains/Losses by Financial Year

- **Type**: Bar chart with positive (gains) and negative (losses) bars
- **X-axis**: Financial year
- **Y-axis**: AUD amount
- **Bars**: Short-term gains, long-term gains (pre-discount), losses
- **Line overlay**: Net capital gain (after discount and loss offset)

### Chart 5: Cumulative ESS Income

- **Type**: Area chart
- **X-axis**: Date (release dates)
- **Y-axis**: Cumulative AUD ESS income
- **Fill**: Gradient fill under the line

## Global Currency Toggle

### Behavior

- Toggle switch in the app header: "USD" | "AUD"
- Persisted to `AppConfig.displayCurrency` in DataStore
- Default: AUD (since this is a tax calculation tool)

### Display Rules

| Context               | USD Mode            | AUD Mode                              |
| --------------------- | ------------------- | ------------------------------------- |
| Raw Shareworks values | Show USD            | Show AUD (converted at relevant date) |
| ESS income            | Show USD equivalent | Show AUD (primary)                    |
| CGT amounts           | Show USD equivalent | Show AUD (primary)                    |
| Cost basis            | Show USD            | Show AUD (at acquisition date rate)   |
| Sale proceeds         | Show USD            | Show AUD (at sale date rate)          |

In AUD mode, the exchange rate used is shown as a tooltip or secondary text: e.g., "A$6,764.21 (rate: 0.6828 on 03-Jan-2023)"

## Drill-Down Audit Trail

Every calculated number in the UI is clickable/expandable to show:

### ESS Income Drill-Down

```
ESS Income: A$X,XXX.XX
├── Source: Release RB6538C8B1
├── Release Date: 18-Feb-2023
├── Shares Vested: 30
├── FMV/Share: US$168.56
├── Gross Value: US$5,056.80 (30 × $168.56)
├── 30-Day Rule: Not applied
├── Exchange Rate: 0.6921 (18-Feb-2023)
└── AUD Value: US$5,056.80 / 0.6921 = A$7,307.47
```

### CGT Drill-Down

```
Capital Gain: A$X,XXX.XX
├── Sale Lot: WRC... (Lot 1)
├── Shares Sold: 30
├── Acquisition: 18-Feb-2020 (RB6538C8B1)
├── Sale: 03-Aug-2021
├── Holding Period: 531 days (> 12 months, discount eligible)
│
├── Cost Basis
│   ├── USD: $4,616.40 (30 × $153.88)
│   ├── Rate: 0.XXXX (18-Feb-2020)
│   └── AUD: A$X,XXX.XX
│
├── Proceeds
│   ├── Gross USD: $9,780.00
│   ├── Brokerage: -$2.33
│   ├── Fees: -$0.05
│   ├── Net USD: $9,777.62
│   ├── Rate: 0.XXXX (03-Aug-2021)
│   └── AUD: A$X,XXX.XX
│
└── Gain: A$X,XXX.XX (before discount)
```

### FY Summary Drill-Down

```
FY 2022-23 Net Capital Gain: A$X,XXX.XX
├── Short-term gains: A$0.00
├── Long-term gains: A$X,XXX.XX
├── Capital losses: A$X,XXX.XX
├── Losses applied to short-term: A$0.00
├── Losses applied to long-term: A$X,XXX.XX
├── Long-term after losses: A$X,XXX.XX
├── 50% discount: -A$X,XXX.XX
└── Net capital gain: A$X,XXX.XX
```

## Responsive Design

- Desktop-first layout (primary use case is financial analysis)
- Tables collapse to card layout on mobile
- Charts resize to fill available width
- Currency toggle always visible in header

## Empty States

- No data imported: prompt to go to import page
- No data for selected FY: "No events in [FY]. Try selecting a different financial year."
- No sales data: releases list still shows ESS income; sales-dependent views show prompt to import sales CSV
