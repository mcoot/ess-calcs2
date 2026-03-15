# CSV Import & Parsing Specification

## Purpose

Parse the four CSV file types exported from Morgan Stanley Shareworks into validated domain objects, with a drag-and-drop upload UI and clear error reporting.

## CSV File Types

### 1. Award Summary

**Detection**: Row 1 is the literal text `Award Summary`. Row 2 contains headers.

**Header row (row 2)**:
```
As Of Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Conversion Price,,Granted,Previously Distributed,,,Not Available For Distribution,,
```

Row 3 is a sub-header row providing column labels for the multi-column groups:
```
,,,,,,,,,Shares,Benefit Received,,Shares,Estimated Benefit,
```

**Data rows start at row 4.**

**Column mapping**:

| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | As Of Date | Date | Report generation date, same for all rows |
| B | Grant Date | Date | When RSUs were granted |
| C | Grant Number | number | Unique grant identifier |
| D | Grant Type | string | Always "Share Units (RSU)" |
| E | Grant Name | string | Descriptive name |
| F | Grant Reason | string | New Hire, Refresh, Ongoing, Supplemental - Stub |
| G | Conversion Price | USD | Dollar-prefixed, e.g. `$52.6476` |
| H | (Currency) | string | Always "USD" |
| I | Granted (Shares) | number | May have comma separators |
| J | Previously Distributed (Shares) | number | |
| K | Benefit Received | USD | Dollar-prefixed with comma separators |
| L | (Currency) | string | Always "USD" |
| M | Not Available For Distribution (Shares) | number | |
| N | Estimated Benefit | USD | |
| O | (Currency) | string | Always "USD" |

**Total row**: Last data row has empty columns A-H and contains totals. Detected by empty Grant Number.

**Produces**: `Award[]`

### 2. Full Vesting Schedule

**Detection**: Row 1 is `Full Vesting Schedule`. Row 2 contains headers.

**Header row (row 2)**:
```
As Of Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Vest Date,Shares
```

**Section breaks**: Lines matching `Grant Number: XXXXX` appear before each grant's entries. These are informational separators.

**Total rows**: Rows where only the last column (Shares) has a value. These appear:
- After each grant's entries (per-grant total)
- At the very end (grand total)

**Data rows**: All rows with a populated Grant Number column.

**Column mapping**:

| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | As Of Date | Date | |
| B | Grant Date | Date | |
| C | Grant Number | number | |
| D | Grant Type | string | |
| E | Grant Name | string | |
| F | Grant Reason | string | |
| G | Vest Date | Date | The scheduled vest date |
| H | Shares | number | Shares vesting on this date |

**Produces**: `VestingScheduleEntry[]`

### 3. RSU Releases

**Detection**: Row 1 is `RSU Releases`. Row 2 contains headers.

**Header row (row 2)**:
```
Period Start Date,Period End Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Release Date,Shares Vested,Shares Sold-To-Cover,Shares Held,Value,,Fair Market Value Per Share,,Sale Date (Sell-To-Cover only),Sale Price Per Share,,Sale Proceeds,,Sell-To-Cover Amount,,Release Reference Number
```

**Total row**: Last row has empty grant fields, totals in numeric columns.

**Column mapping**:

| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | Period Start Date | Date | Report filter start |
| B | Period End Date | Date | Report filter end |
| C | Grant Date | Date | |
| D | Grant Number | number | |
| E | Grant Type | string | |
| F | Grant Name | string | |
| G | Grant Reason | string | |
| H | Release Date | Date | Actual vesting date |
| I | Shares Vested | number | |
| J | Shares Sold-To-Cover | number | |
| K | Shares Held | number | |
| L | Value | USD | Total value at vesting |
| M | (Currency) | string | |
| N | Fair Market Value Per Share | USD | |
| O | (Currency) | string | |
| P | Sale Date (Sell-To-Cover only) | Date? | Optional |
| Q | Sale Price Per Share | USD? | Optional |
| R | (Currency) | string | |
| S | Sale Proceeds | USD? | Optional |
| T | (Currency) | string | |
| U | Sell-To-Cover Amount | USD | |
| V | (Currency) | string | |
| W | Release Reference Number | string | e.g. "RB6538C8B1" |

**Produces**: `RsuRelease[]`

### 4. Sales - Long Shares

**Detection**: Row 1 is `Sales - Long Shares`. Row 2 contains headers.

**Header row (row 2)**:
```
Period Start Date,Period End Date,Withdrawal Reference Number,Originating Release Reference Number,Employee Grant Number,Grant Name,Lot Number,Sale Type,Sale Date,Original Acquisition Date,Sold Within 30 Days of Vest,Original Cost Basis Per Share,,Original Cost Basis,,Shares Sold,Sale Proceeds,,Sale Price Per Share,,Brokerage Commission,,Supplemental Transaction Fee,
```

**Total row**: Last row with empty identifying columns and totals.

**Column mapping**:

| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | Period Start Date | Date | |
| B | Period End Date | Date | |
| C | Withdrawal Reference Number | string | e.g. "WRC6476B1C8-1EE" |
| D | Originating Release Reference Number | string | Links to RsuRelease |
| E | Employee Grant Number | number | |
| F | Grant Name | string | |
| G | Lot Number | number | |
| H | Sale Type | string | "Long Shares" |
| I | Sale Date | Date | |
| J | Original Acquisition Date | Date | Vesting date |
| K | Sold Within 30 Days of Vest | boolean | "YES" / "NO" |
| L | Original Cost Basis Per Share | USD | |
| M | (Currency) | string | |
| N | Original Cost Basis | USD | |
| O | (Currency) | string | |
| P | Shares Sold | number | |
| Q | Sale Proceeds | USD | |
| R | (Currency) | string | |
| S | Sale Price Per Share | USD | |
| T | (Currency) | string | |
| U | Brokerage Commission | USD | |
| V | (Currency) | string | |
| W | Supplemental Transaction Fee | USD | |
| X | (Currency) | string | |

**Produces**: `SaleLot[]`

## File Upload UI

### Layout

Single import page with:
- Drag-and-drop zone accepting `.csv` files
- File picker button as fallback
- Support for multiple files in one drop
- Display of currently loaded data per type (row counts, date ranges)

### Auto-Detection

On file upload:
1. Read the first line of the file
2. Match against known title strings: `Award Summary`, `Full Vesting Schedule`, `RSU Releases`, `Sales - Long Shares`
3. If no match, show an error identifying the unrecognized file

### Import Flow

```
File selected/dropped
  → Read as text (FileReader API)
  → Detect CSV type from row 1
  → Parse with type-specific parser
  → Validate all fields (Zod schema)
  → Show validation results (success count, errors)
  → On user confirm: persist to DataStore (replacing existing data for this type)
```

## Parsing Rules

### Date Parsing

All dates are in `DD-Mon-YYYY` format (e.g., `15-Mar-2026`, `18-Feb-2020`).

Parser must handle:
- 3-letter month abbreviations: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
- Consistent conversion to `Date` objects (midnight UTC)

### Money Parsing

Values are dollar-prefixed with optional comma thousand separators and optional quotes:
- `$52.6476` → 52.6476
- `"$91,148.86"` → 91148.86
- `$0.00` → 0

Strip `$`, strip commas, parse as float.

### Number Parsing

Share counts may have comma separators and quotes:
- `"5,824"` → 5824
- `475` → 475

### Boolean Parsing

`Sold Within 30 Days of Vest`: `YES` → true, `NO` → false

### Row Filtering

Skip:
- Title row (row 1)
- Header row(s) (row 2, and row 3 for Award Summary)
- Section break rows (e.g., `Grant Number: XXXXX` in Vesting Schedule)
- Total/summary rows (detected by empty key fields like Grant Number)
- Empty rows

## Validation

### Per-Field Validation (Zod)

- Required fields must be present and non-empty
- Dates must parse to valid dates
- Numbers must be finite and non-negative
- Money values must be finite
- Grant numbers must be positive integers
- Reference numbers must be non-empty strings

### Referential Integrity (post-parse)

After all files are imported, check:
- Every `SaleLot.originatingReleaseRef` should match an `RsuRelease.releaseReferenceNumber`
- Every `SaleLot.grantNumber` should match an `Award.grantNumber`
- Every `VestingScheduleEntry.grantNumber` should match an `Award.grantNumber`

These are **warnings**, not blocking errors. Data may be imported from different date ranges.

### Reconciliation Checks

- Sum of `VestingScheduleEntry.shares` per grant should equal `Award.sharesGranted`
- Sum of shares sold per release should not exceed `RsuRelease.sharesVested`
- `RsuRelease.sharesVested` should equal `sharesHeld + sharesSoldToCover`

Display as warnings in the import results UI.

## Error Reporting

### Structure

```typescript
interface ParseResult<T> {
  success: boolean;
  data: T[];                    // Successfully parsed rows
  errors: ParseError[];         // Per-row errors
  warnings: string[];           // Reconciliation warnings
  summary: {
    totalRows: number;
    parsedRows: number;
    skippedRows: number;        // Headers, totals, section breaks
    errorRows: number;
  };
}

interface ParseError {
  row: number;                  // 1-based row number in CSV
  field: string;                // Column name
  value: string;                // Raw value that failed
  message: string;              // Human-readable error
}
```

### UI Display

- Success: green banner with count of imported records
- Warnings: yellow collapsible section with reconciliation issues
- Errors: red section with per-row error details, showing row number and raw value
- Partial import: if some rows fail, offer to import the valid rows (with confirmation)

## Re-Import Strategy

- **Full replacement per CSV type**: Importing a new Award Summary replaces all existing `Award` records
- No merge, no diffing, no deduplication
- User is warned before replacement if existing data will be overwritten
- Data from other CSV types is unaffected (importing new awards doesn't touch releases or sales)

## Edge Cases

- File with BOM (byte order mark): strip before parsing
- Windows line endings (`\r\n`): handle alongside Unix (`\n`)
- Quoted fields containing commas: standard CSV quoting rules
- Empty file or file with only headers: show "no data rows found" message
- Very large files: parse in streaming fashion if possible, but Shareworks exports are typically <1000 rows
