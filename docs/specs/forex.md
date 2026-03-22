# Forex Service Specification

## Purpose

Provide USD-to-AUD currency conversion using official RBA exchange rates, with date lookup and business-day fallback logic.

## Data Source

### RBA CSV Format

The bundled file `data/public/rba-forex.csv` is the RBA's F11.1 Exchange Rates table.

**Header structure (rows 1-11)**:

| Row | Content |
|-----|---------|
| 1 | Title: `F11.1  EXCHANGE RATES` |
| 2 | Column headers: `Title,A$1=USD,Trade-weighted Index May 1970 = 100,A$1=CNY,...` |
| 3 | Descriptions |
| 4 | Frequency: `Daily` |
| 5 | Type: `Indicative` |
| 6 | Units: `USD,Index,CNY,...` |
| 7 | (empty) |
| 8 | (empty) |
| 9 | Source: `WM/Reuters,RBA,...` |
| 10 | Publication date |
| 11 | Series ID: `FXRUSD,FXRTWI,...` |

**Data rows start at row 12.**

**Data format**: `DD-Mon-YYYY,rate,...`

Example:
```
03-Jan-2023,0.6828,61.40,4.6994,...
04-Jan-2023,0.6809,61.50,4.6906,...
```

### Relevant Column

Column B (index 1): `A$1=USD` (Series ID: `FXRUSD`)

This is the AUD/USD rate: how many USD one Australian dollar buys.

### Parsing

1. Skip rows 1-11 (header block)
2. For each data row, extract:
   - Column A: date in `DD-Mon-YYYY` format
   - Column B: `audToUsd` rate as a float
3. Skip rows where the USD column is empty (public holidays, RBA closures)
4. Build a sorted array of `ForexRate` objects

## Conversion Formula

The RBA publishes `A$1 = x USD`, meaning:

```
1 AUD = audToUsd USD
```

To convert USD to AUD:

```
AUD = USD / audToUsd
```

To convert AUD to USD:

```
USD = AUD × audToUsd
```

### Example

On 03-Jan-2023, `audToUsd = 0.6828`:
- $100 USD = $100 / 0.6828 = $146.46 AUD
- $100 AUD = $100 × 0.6828 = $68.28 USD

## Date Lookup with Business-Day Fallback

### Algorithm

```
function getRate(date: Date): ForexRate {
  1. Look up exact date match in rates array
  2. If found, return it
  3. If not found (weekend, public holiday, or gap):
     - Search backwards from date for the nearest prior rate
     - Return the nearest prior rate
  4. If no prior rate exists (date is before data range):
     - Throw/return an error indicating missing rate
}
```

### Rationale

The ATO accepts "a reasonable exchange rate" - the nearest prior business day rate from the RBA is the most defensible choice. The RBA does not publish rates on:
- Weekends (Saturday, Sunday)
- Australian public holidays
- RBA closure days

### Implementation Note

Since rates are stored sorted by date, a binary search finds the insertion point, then step back to the nearest prior rate.

## Service Interface

```typescript
interface ForexService {
  /**
   * Convert USD to AUD using the rate on the given date.
   * Falls back to nearest prior business day if no rate on exact date.
   */
  usdToAud(amount: USD, date: Date): { aud: AUD; rate: number; rateDate: Date };

  /**
   * Convert AUD to USD using the rate on the given date.
   */
  audToUsd(amount: AUD, date: Date): { usd: USD; rate: number; rateDate: Date };

  /**
   * Get the raw AUD/USD rate for a date.
   * Returns the rate and the actual date it was sourced from.
   */
  getRate(date: Date): { rate: number; rateDate: Date };

  /**
   * Check if rates are available for a date range.
   * Returns dates within the range that have no coverage.
   */
  checkCoverage(startDate: Date, endDate: Date): { covered: boolean; gaps: DateRange[] };

  /**
   * Get the date range covered by loaded rates.
   */
  getDateRange(): { earliest: Date; latest: Date };
}
```

### Return Values

All conversion methods return the rate and actual rate date alongside the converted amount. This supports the audit trail requirement - every converted value is traceable to the specific rate used.

## Data Coverage

### Bundled Data

The RBA CSV is expanded to cover **2018-present** (publicly available from the RBA website). This covers all vesting and sale dates in the sample data.

### Gap Handling

For dates before the bundled data range:
- `getRate()` throws a `MissingRateError` with the requested date
- The UI displays a warning: "No exchange rate available for [date]. Rate data starts from [earliest date]."
- No silent fallbacks or approximations for missing data

### Rate Data Updates

The bundled CSV should be updated periodically (e.g., monthly) by downloading the latest RBA data. This is a build-time concern, not a runtime one.

## Initialization

```
App startup
  → Fetch /data/public/rba-forex.csv
  → Parse header (skip 11 rows)
  → Parse data rows into ForexRate[]
  → Sort by date ascending
  → Build lookup index (Map<dateString, ForexRate>)
  → Store in ForexService instance
```

The forex data is also persisted to IndexedDB via the DataStore, but the canonical source is always the bundled CSV (re-parsed on app startup to pick up any updates from new deployments).

## Edge Cases

- **Rate of exactly 0**: Should never occur in RBA data; reject during parsing
- **Multiple rates on same date**: RBA publishes one rate per business day; if duplicates appear, use the last one
- **Date before 2018**: Error - data not available
- **Future dates**: Error - no rate available yet
- **Date format parsing**: Must handle the RBA's `DD-Mon-YYYY` format (e.g., `03-Jan-2023`)
- **Empty cells in data rows**: Some rows may have empty cells for certain currencies but valid USD rates; extract only the USD column

## Golden Test Cases

### Test Case 1: Exact Date Match

**Input**: `getRate(new Date('2023-01-03'))`
**Expected**: `{ rate: 0.6828, rateDate: 2023-01-03 }`

### Test Case 2: Weekend Fallback

**Input**: `getRate(new Date('2023-01-07'))` (Saturday)
**Expected**: Returns rate from 06-Jan-2023: `{ rate: 0.6769, rateDate: 2023-01-06 }`

### Test Case 3: USD to AUD Conversion

**Input**: `usdToAud(100 as USD, new Date('2023-01-03'))`
**Expected**: `{ aud: 146.46 (100/0.6828), rate: 0.6828, rateDate: 2023-01-03 }`

### Test Case 4: Missing Rate (Pre-Data)

**Input**: `getRate(new Date('2017-01-01'))`
**Expected**: Throws `MissingRateError`

## Verification Invariants

1. `usdToAud(amount, date).aud × getRate(date).rate ≈ amount` (round-trip)
2. All rates are positive (> 0)
3. Rates are monotonically dated (no duplicate dates after dedup)
4. Business-day fallback never jumps forward (always looks backward)
5. Every conversion result includes the actual rate date used
