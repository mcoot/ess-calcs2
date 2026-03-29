# Tax Report Generation Specification

## Purpose

Generate Australian financial year tax reports for ESS income and CGT, formatted to align with ATO tax return items, with per-event detail rows and export capability.

## Financial Year Scope

Australian financial years: 1 July to 30 June.

Reports are generated per financial year. The user selects the FY from a dropdown populated by the data range.

## Report Sections

### Section 1: ESS Income (Item 12, Label F)

**ATO Context**: ESS income is reported at Item 12 ("Employee share schemes") on the supplementary tax return, specifically at Label F ("Discount from deferral schemes").

**Report Content**:

#### Summary

| Field                    | Value                            |
| ------------------------ | -------------------------------- |
| Financial Year           | e.g. "2024-25"                   |
| Total ESS Discount (AUD) | Sum of all ESS income for the FY |
| Tax Return Item          | "Item 12, Label F"               |

#### Detail Rows

One row per ESS income event (per release, or per 30-day lot):

| Column            | Description                                           |
| ----------------- | ----------------------------------------------------- |
| Date              | Taxing point date (vest date or sale date for 30-day) |
| Grant             | Grant number and name                                 |
| Release Ref       | Release reference number                              |
| Shares            | Number of shares                                      |
| FMV/Share (USD)   | Fair market value at taxing point                     |
| Gross Value (USD) | Total USD value                                       |
| Exchange Rate     | AUD/USD rate used                                     |
| Rate Date         | Actual date the rate was sourced from                 |
| ESS Income (AUD)  | Converted AUD amount                                  |
| 30-Day Rule       | "Yes" or "No"                                         |
| Notes             | e.g., "Sold 24-Feb-2023, 11 days after vest"          |

#### Subtotals

- Subtotal by grant
- Grand total for the FY

### Section 2: CGT Schedule (Item 18, Labels H+A)

**ATO Context**: Capital gains are reported at Item 18 ("Capital gains") on the supplementary tax return:

- Label H: "Total current year capital gains"
- Label A: "Net capital gain"

**Report Content**:

#### Summary

| Field                                  | Value                                     |
| -------------------------------------- | ----------------------------------------- |
| Financial Year                         | e.g. "2024-25"                            |
| Total Current Year Capital Gains (AUD) | Label H value                             |
| Net Capital Gain (AUD)                 | Label A value (after losses and discount) |

#### Gain/Loss Calculation Walkthrough

```
Short-term capital gains:          A$X,XXX.XX
Long-term capital gains:           A$X,XXX.XX
Total capital gains (Label H):     A$X,XXX.XX

Capital losses applied:           -A$X,XXX.XX
  Applied to short-term:          -A$X,XXX.XX
  Applied to long-term:           -A$X,XXX.XX

Long-term gains after losses:      A$X,XXX.XX
50% CGT discount:                 -A$X,XXX.XX

Net capital gain (Label A):        A$X,XXX.XX
```

If there is a net capital loss:

```
Net capital loss:                  A$X,XXX.XX
(Carry forward to future years - not automatically applied)
```

#### Detail Rows

One row per `SaleLot` (excluding 30-day lots):

| Column                  | Description              |
| ----------------------- | ------------------------ |
| Sale Date               | Date shares were sold    |
| Acquisition Date        | Original vesting date    |
| Grant                   | Grant number and name    |
| Lot                     | Lot number               |
| Shares                  | Shares sold              |
| Holding Period          | Days held                |
| Discount Eligible       | Yes/No                   |
| Cost Basis (USD)        |                          |
| Cost Basis (AUD)        | With rate and rate date  |
| Net Proceeds (USD)      | After brokerage and fees |
| Net Proceeds (AUD)      | With rate and rate date  |
| Capital Gain/Loss (AUD) |                          |

#### Subtotals

- Subtotal by sale event (withdrawal reference)
- Subtotal by holding period category (short-term / long-term)
- Grand total

### Section 3: 30-Day Rule Summary

A cross-reference section showing lots handled under the 30-day rule:

| Column              | Description                                 |
| ------------------- | ------------------------------------------- |
| Sale Date           | When shares were sold                       |
| Vest Date           | When shares originally vested               |
| Days Held           | Days between vest and sale                  |
| Grant               | Grant number and name                       |
| Shares              | Number of shares                            |
| Sale Proceeds (USD) |                                             |
| ESS Income (AUD)    | Amount reported as income (not CGT)         |
| Note                | "Included in ESS Income, excluded from CGT" |

## Export Formats

### CSV Export

- One CSV file per report section
- Or a combined CSV with a section header row between sections
- Headers match the detail row columns above
- UTF-8 encoding with BOM (for Excel compatibility)
- Filename: `ess-tax-report-FY2024-25-ess-income.csv`, `ess-tax-report-FY2024-25-cgt.csv`

### Printable HTML

- Single-page HTML document with print-optimized CSS
- Includes all three sections
- Header with: report title, financial year, generation date
- Footer with: "Generated by ESS Calcs2 - for reference only, verify with tax professional"
- Page breaks between sections
- Triggered via browser print dialog (`window.print()`)
- Filename for save-as: `ess-tax-report-FY2024-25.html`

## Custom Date Range

In addition to FY-based reports, support custom date range:

- User specifies start and end dates
- Report covers events within that range
- Clearly labelled as "Custom Period" (not a financial year)
- Loss offsetting and discount calculations still apply within the custom range
- Useful for quarterly reviews or mid-year planning

## Quarterly Breakdown

Within an FY report, optionally show quarterly subtotals:

- Q1: Jul-Sep
- Q2: Oct-Dec
- Q3: Jan-Mar
- Q4: Apr-Jun

Displayed as collapsible sub-sections within each report section.

## Report Generation Flow

```
User selects FY (or custom range)
  → Query ESS income service for releases/lots in range
  → Query CGT service for sale lots in range
  → Build report data structure
  → Render in UI
  → Export buttons: [CSV] [Print]
```

## Data Requirements

Reports require:

- RSU Releases (for ESS income)
- Sales - Long Shares (for CGT)
- Forex rates covering all dates in the report range

If any data is missing:

- Show which CSV types need to be imported
- For missing forex rates: show which dates lack coverage

## Edge Cases

- **FY with no events**: Show empty report with "No ESS or CGT events in this financial year"
- **Partial data**: If releases are imported but not sales, show ESS income section only with a note
- **30-day rule crossing FY boundary**: The lot appears in the FY of the sale date (the taxing point), even if the vest was in the prior FY
- **Very large reports**: Paginate detail rows if needed (unlikely given typical data volumes)
- **Rounding**: All AUD amounts rounded to nearest cent for display; use unrounded values for subtotals to avoid rounding drift, then round the final total

## Disclaimer

All reports include a footer disclaimer:

> This report is generated for informational purposes only. It is not tax advice. Verify all calculations with a qualified tax professional before lodging your tax return. Exchange rates sourced from the Reserve Bank of Australia.
