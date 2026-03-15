# Data Store & Persistence Specification

## Purpose

Provide a persistence layer using IndexedDB for domain objects, with an in-memory model for fast queries and a clean interface for dependency injection and testing.

## Architecture

```
                     ┌──────────────────┐
                     │   DataStore      │  Interface (contract)
                     │   Interface      │
                     └────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
    │ IndexedDBStore  │ │ InMemory   │ │ (future     │
    │ (production)    │ │ FakeStore  │ │  impls)     │
    └────────────────┘ │ (testing)  │ └─────────────┘
                       └────────────┘
```

On startup, `IndexedDBStore` loads all data into an in-memory model. All reads operate on the in-memory copy. Writes persist to IndexedDB and update the in-memory model.

## DataStore Interface

```typescript
interface DataStore {
  // Awards
  getAwards(): Award[];
  setAwards(awards: Award[]): Promise<void>;

  // Vesting Schedule
  getVestingSchedule(): VestingScheduleEntry[];
  setVestingSchedule(entries: VestingScheduleEntry[]): Promise<void>;

  // RSU Releases
  getReleases(): RsuRelease[];
  setReleases(releases: RsuRelease[]): Promise<void>;

  // Sale Lots
  getSaleLots(): SaleLot[];
  setSaleLots(lots: SaleLot[]): Promise<void>;

  // Forex Rates
  getForexRates(): ForexRate[];
  setForexRates(rates: ForexRate[]): Promise<void>;

  // Config
  getConfig<K extends keyof AppConfig>(key: K): AppConfig[K] | undefined;
  setConfig<K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<void>;

  // Bulk operations
  clearAll(): Promise<void>;
  clearByType(type: DataType): Promise<void>;
  exportAll(): Promise<DataExport>;
  importAll(data: DataExport): Promise<void>;

  // Lifecycle
  initialize(): Promise<void>;   // Load IndexedDB into memory
  isInitialized(): boolean;
}

type DataType = 'awards' | 'vestingSchedule' | 'releases' | 'saleLots' | 'forexRates';

interface AppConfig {
  displayCurrency: 'USD' | 'AUD';
  lastImportDate?: string;        // ISO date string
  importedFileTypes?: DataType[]; // Which CSV types have been imported
}
```

### Design Notes

- `get*()` methods are synchronous (read from in-memory model)
- `set*()` methods are async (persist to IndexedDB, then update in-memory)
- Set methods use full replacement semantics (consistent with import strategy)
- `initialize()` must be called before any reads; components should await initialization

## IndexedDB Schema

### Database Name

`ess-calcs2`

### Version

`1` (increment on schema changes with migration logic)

### Object Stores

| Store Name | Key Path | Indexes | Contents |
|------------|----------|---------|----------|
| `awards` | `grantNumber` | `grantDate` | `Award[]` |
| `vestingSchedule` | auto-increment | `grantNumber`, `vestDate` | `VestingScheduleEntry[]` |
| `releases` | `releaseReferenceNumber` | `grantNumber`, `releaseDate` | `RsuRelease[]` |
| `saleLots` | auto-increment | `withdrawalReferenceNumber`, `originatingReleaseRef`, `grantNumber`, `saleDate` | `SaleLot[]` |
| `forexRates` | `date` | (none) | `ForexRate[]` |
| `config` | `key` | (none) | `{ key: string, value: any }` |

### Date Storage

Dates are stored as ISO 8601 strings (`YYYY-MM-DD`) in IndexedDB and reconstituted as `Date` objects when loaded into memory. This avoids IndexedDB date serialization quirks.

## In-Memory Fake Implementation

For unit tests - a synchronous, state-based implementation:

```typescript
class InMemoryFakeStore implements DataStore {
  private awards: Award[] = [];
  private vestingSchedule: VestingScheduleEntry[] = [];
  private releases: RsuRelease[] = [];
  private saleLots: SaleLot[] = [];
  private forexRates: ForexRate[] = [];
  private config: Partial<AppConfig> = {};
  private initialized = false;

  // All get* methods return copies of internal arrays
  // All set* methods resolve immediately (no actual persistence)
  // initialize() just sets initialized = true
}
```

This allows tests to:
- Pre-populate with known data
- Assert against store state after operations
- Run without browser APIs (no IndexedDB dependency)

## JSON Backup (Export/Import)

### Export Format

```typescript
interface DataExport {
  version: 1;
  exportedAt: string;           // ISO timestamp
  awards: Award[];
  vestingSchedule: VestingScheduleEntry[];
  releases: RsuRelease[];
  saleLots: SaleLot[];
  // Forex rates are NOT included (bundled with app)
  config: Partial<AppConfig>;
}
```

### Export Flow

1. `dataStore.exportAll()` serializes all domain objects to JSON
2. Create a `Blob` with `application/json` MIME type
3. Trigger download via temporary `<a>` element with `download` attribute
4. Filename: `ess-calcs2-backup-YYYY-MM-DD.json`

### Import Flow

1. User selects a `.json` file
2. Parse and validate against `DataExport` Zod schema
3. Warn user that import will replace all existing data
4. On confirm: call `dataStore.importAll(data)`
5. Reload in-memory model

### What's Not Exported

- Forex rates (bundled with app, would bloat the backup file)
- Calculated values (derived on demand)

## Data Clearing

### Per-Type Clear

- `clearByType('awards')` removes all awards from IndexedDB and in-memory model
- Other data types unaffected
- UI should confirm before clearing

### Full Clear

- `clearAll()` removes all data from all stores
- Resets config to defaults
- UI should require explicit confirmation ("Delete all data")

## Initialization Sequence

```
App mount
  → DataStore.initialize()
    → Open IndexedDB connection
    → Load all object stores into memory
    → Parse forex rates from bundled CSV (if not already in store)
  → App renders with data available
```

If IndexedDB is unavailable (private browsing in some browsers):
- Fall back to in-memory only mode
- Warn user that data won't persist between sessions
- All functionality still works within the session

## Edge Cases

- **Concurrent tabs**: IndexedDB supports concurrent access but the in-memory model won't sync across tabs. Accept this limitation; show a warning if another tab is detected.
- **Storage quota**: Monitor `navigator.storage.estimate()` and warn if approaching limits (unlikely for this data volume).
- **Corrupted data**: If IndexedDB data fails Zod validation on load, log the error, clear the corrupted store, and notify the user.
- **Browser migration**: JSON export/import provides a path to move data between browsers.
