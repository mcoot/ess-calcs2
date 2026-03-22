# ESS Calcs2 - Application Specification

## Purpose

ESS Calcs2 is a client-side NextJS web application for calculating Australian tax obligations on Employee Share Scheme (ESS) RSU grants, using CSV exports from Morgan Stanley Shareworks. All data processing happens entirely in the browser - no data ever leaves the user's machine.

## Architecture

### Client-Side Only

- NextJS App Router with `output: 'export'` (static site generation)
- All pages use `"use client"` - App Router provides routing and layouts only
- Deployable to any static hosting (GitHub Pages, S3, Vercel static)
- No API routes, no server components, no SSR

### Layer Architecture

```
┌─────────────────────────────────┐
│            UI Layer             │  React components, pages, layouts
├─────────────────────────────────┤
│         Service Layer           │  Calculation engines, business logic
├─────────────────────────────────┤
│         Data Store Layer        │  IndexedDB persistence, in-memory model
├─────────────────────────────────┤
│         Parser Layer            │  CSV parsing, validation, normalization
└─────────────────────────────────┘
```

- **UI Layer**: React components using shadcn/ui + Tailwind CSS. Consumes services via dependency injection.
- **Service Layer**: Pure business logic with no browser dependencies. Services are "unit bubbles" - all dependencies injected, all state passed in. No singletons.
- **Data Store Layer**: IndexedDB for persistence, with an in-memory model loaded on startup. All queries operate against the in-memory model. A `DataStore` interface enables DI and test fakes.
- **Parser Layer**: CSV parsing and validation. Transforms raw CSV text into validated domain objects.

### Data Flow

```
CSV File Upload → Parser → Validated Domain Objects → DataStore (IndexedDB)
                                                           ↓
App Startup → Load IndexedDB → In-Memory Model → Services → UI
```

### Static Assets

- RBA forex CSV bundled in `data/public/rba-forex.csv`
- Loaded at startup and parsed into the forex service

## Data Model

### Domain Types

```typescript
// Branded money types to prevent USD/AUD confusion
type USD = number & { readonly __brand: 'USD' };
type AUD = number & { readonly __brand: 'AUD' };

interface Award {
  grantDate: Date;
  grantNumber: number;          // e.g. 9375, 14333
  grantType: string;            // "Share Units (RSU)"
  grantName: string;            // e.g. "02.15.2018 RSU Grant (New Hire)"
  grantReason: string;          // New Hire, Refresh, Ongoing, Supplemental - Stub
  conversionPrice: USD;         // Strike price (cost paid per share, typically $0 economics for RSUs but Shareworks records a value)
  sharesGranted: number;
}

interface VestingScheduleEntry {
  grantNumber: number;
  vestDate: Date;
  shares: number;
}

interface RsuRelease {
  grantDate: Date;
  grantNumber: number;
  grantName: string;
  grantReason: string;
  releaseDate: Date;            // Actual vesting date
  sharesVested: number;
  sharesSoldToCover: number;
  sharesHeld: number;
  valueUsd: USD;                // Total value at vesting
  fmvPerShare: USD;             // Fair market value per share at vesting
  saleDateSellToCover?: Date;
  salePricePerShare?: USD;
  saleProceeds?: USD;
  sellToCoverAmount: USD;
  releaseReferenceNumber: string; // e.g. "RB6538C8B1"
}

interface SaleLot {
  withdrawalReferenceNumber: string;  // e.g. "WRC6476B1C8-1EE"
  originatingReleaseRef: string;      // Links to RsuRelease
  grantNumber: number;
  grantName: string;
  lotNumber: number;
  saleType: string;                   // "Long Shares"
  saleDate: Date;
  originalAcquisitionDate: Date;      // Vesting date (cost basis date)
  soldWithin30Days: boolean;          // Critical for 30-day rule
  costBasisPerShare: USD;
  costBasis: USD;
  sharesSold: number;
  saleProceeds: USD;
  salePricePerShare: USD;
  brokerageCommission: USD;
  supplementalTransactionFee: USD;
}

interface ForexRate {
  date: Date;
  audToUsd: number;   // A$1 = x USD (as published by RBA)
}
```

### Key Relationships

```
Award (grantNumber)
  ├── VestingScheduleEntry[] (via grantNumber) — scheduled vest tranches
  ├── RsuRelease[] (via grantNumber) — actual vesting events
  │     └── SaleLot[] (via originatingReleaseRef → releaseReferenceNumber)
  └── SaleLot[] (via grantNumber) — all sales for this grant
```

- A single withdrawal (sale event) produces multiple `SaleLot` rows when shares from different releases are sold together
- Each `SaleLot` traces back to exactly one `RsuRelease` via `originatingReleaseRef`
- Multiple `SaleLot` rows can share a `withdrawalReferenceNumber` (same sale, different lots)

### Validation

- Zod schemas are the source of truth for all domain types
- TypeScript types derived from Zod schemas via `z.infer<>`
- Validation occurs at parse time; domain objects in the store are always valid

## Calculation Engine

### ESS Income (per release)

For each `RsuRelease`, ESS taxable income = market value at vesting (since RSU cost base is $0):

```
ESS Income (USD) = sharesVested × fmvPerShare
ESS Income (AUD) = ESS Income (USD) / audToUsd(releaseDate)
```

**30-Day Rule**: When a `SaleLot` has `soldWithin30Days === true`:
- The taxing point shifts from the vest date to the sale date
- ESS income = sale proceeds (not vest value) for that lot
- No separate CGT event for that lot
- Applied at per-lot granularity: a single release can have mixed lots (some within 30 days, some not)

See `docs/specs/ess-income.md` for full specification.

### Capital Gains Tax (per sale lot)

For each `SaleLot` where `soldWithin30Days === false`:

```
Cost Basis (AUD) = costBasis (USD) / audToUsd(originalAcquisitionDate)
Proceeds (AUD)   = (saleProceeds - brokerageCommission - supplementalTransactionFee) (USD) / audToUsd(saleDate)
Capital Gain/Loss (AUD) = Proceeds (AUD) - Cost Basis (AUD)
```

- **12-month discount**: If `saleDate - originalAcquisitionDate > 12 months`, eligible for 50% CGT discount
- **Loss offsetting order**: Capital losses offset short-term gains first, then long-term gains, then apply 50% discount to remaining long-term gains
- Capital losses per year are displayed but NOT automatically carried forward

See `docs/specs/cgt.md` for full specification.

### Forex

- RBA daily exchange rates, `A$1 = x USD` format
- Conversion: `AUD = USD / audToUsd` rate
- Date lookup with nearest-prior-business-day fallback for weekends/holidays
- Bundled data covers 2018-present

See `docs/specs/forex.md` for full specification.

## Currency Display

- **Internal storage**: All monetary values stored in USD (original Shareworks currency)
- **Global toggle**: User can switch display between USD and AUD
- **AUD display**: Uses date-appropriate exchange rate for each value
- **Calculation results**: ESS income and CGT always produce AUD results (per ATO requirements)
- Exchange rate used for display is always shown alongside converted values

## Technical Standards

### TypeScript

- Strict mode enabled, no `any` types
- Branded types for USD/AUD monetary values
- Zod schemas as single source of truth for domain types

### Testing Strategy

Two test layers:

1. **Vitest unit tests**: Service-level logic, parsers, calculations
   - Hand-calculated golden test cases for all tax calculations
   - Cross-validation against sample Shareworks data
   - Property-based invariant tests (e.g., ESS income + CGT should reconcile)
   - Snapshot regression for calculation outputs

2. **Playwright E2E tests**: Full user workflows
   - CSV import flow
   - Calculation verification against known data
   - Currency toggle behavior
   - Report generation

### Financial Correctness

- Every calculated number must be drillable to its inputs, formula, and exchange rate used
- Reconciliation checks after import:
  - Total shares across releases should match award summary
  - Sale lots should not reference non-existent releases
  - Shares sold should not exceed shares from the originating release
- Hand-calculated golden test cases derived from the sample Shareworks data

### Decimal Precision

- Start with `number` type and careful rounding (2dp for display, full precision for intermediates)
- Add `decimal.js` only if floating-point issues surface in tests

### UI Framework

- **shadcn/ui**: Copy-paste components built on Radix primitives
- **Tailwind CSS**: Utility-first styling
- **Recharts**: React-native charting library for visualizations

## Implementation Phases

### Phase 1: Foundation
- NextJS scaffolding with App Router + `output: 'export'`
- Domain types (Zod schemas + branded money types)
- Date utilities and money helper functions
- Forex CSV parser and service
- Unit tests for all foundation code

### Phase 2: Data Layer
- CSV parsers for all 4 Shareworks file types:
  - Award Summary
  - Full Vesting Schedule
  - RSU Releases
  - Sales - Long Shares
- IndexedDB data store implementation
- In-memory fake data store for testing
- Import service with validation and reconciliation checks
- Unit tests for parsers and store

### Phase 3: Calculation Engine
- ESS income calculation service (including 30-day rule)
- CGT calculation service (including 12-month discount and loss ordering)
- Golden test cases with hand-calculated expected values
- Property-based invariant tests

### Phase 4: Basic UI
- Import page (drag-drop, file picker, CSV type auto-detection)
- List views: awards, releases, sales
- Currency toggle (USD/AUD)
- Basic error display for import issues

### Phase 5: Visualization
- Dashboard with summary cards
- Charts: vest value over time, gains/losses by year, share price at vest
- Time-range filtering (financial year, custom)

### Phase 6: Reports
- Australian financial year tax reports
- ESS income section (Item 12 / Label F)
- CGT schedule (Item 18 / Labels H+A)
- Per-event detail with formula breakdown
- Export: CSV, printable HTML

### Phase 7: Polish
- Reconciliation warnings UI
- Audit trail drill-down for every calculated value
- Playwright E2E tests
- Edge case handling and error recovery

## Individual Feature Specifications

| Spec | File | Scope |
|------|------|-------|
| CSV Import & Parsing | `csv-import.md` | File upload UI, per-type parser design, validation, error reporting, re-import strategy |
| Data Store & Persistence | `data-store.md` | IndexedDB schema, DataStore interface, in-memory fake, JSON backup, data clearing |
| ESS Income Calculation | `ess-income.md` | Per-release ESS income formula, 30-day rule at per-lot granularity, AUD conversion, FY aggregation, golden test cases |
| Capital Gains Tax | `cgt.md` | Per-lot CGT, AUD conversion at respective dates, 12-month discount, ATO loss ordering, FY aggregation, golden test cases |
| Forex Service | `forex.md` | RBA CSV parsing, conversion formula, business-day fallback, gap handling, service interface |
| Query & Visualization | `query-visualization.md` | Dashboard, list views, time-range filtering, charts, currency toggle, audit trail drill-down |
| Tax Report Generation | `reports.md` | FY reports, ATO item mapping, per-event detail, export formats, date range support |

## Resolved Design Decisions

1. **Forex data gap**: The bundled RBA CSV covers 2018-present (publicly available data). No runtime fetching needed.
2. **Capital loss carry-forward**: Display gains/losses per year but do NOT automatically carry losses forward across years. The user accounts for this manually. This avoids complex multi-year state management.
3. **Re-import strategy**: Full replacement per CSV type. Importing an Award Summary replaces all existing awards. Simpler and less error-prone than merge logic.
4. **Decimal precision**: Start with native `number` and careful rounding. Add `decimal.js` only if floating-point issues surface during testing.
5. **Charts**: Recharts - React-native, composable, lightweight.
6. **UI components**: shadcn/ui + Tailwind CSS - copy-paste components on Radix primitives, full control, no runtime dependency.
