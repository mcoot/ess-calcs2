import type { Award, VestingScheduleEntry, RsuRelease, SaleLot, ForexRate, AppConfig } from "@/types";

/**
 * DataStore — persistence interface for all domain data.
 * Implementations: IndexedDBStore (production), FakeStore (tests).
 */
export interface DataStore {
  // Awards
  getAwards(): Promise<Award[]>;
  saveAwards(awards: Award[]): Promise<void>;
  clearAwards(): Promise<void>;

  // Vesting schedule
  getVestingSchedule(): Promise<VestingScheduleEntry[]>;
  saveVestingSchedule(entries: VestingScheduleEntry[]): Promise<void>;
  clearVestingSchedule(): Promise<void>;

  // RSU releases
  getRsuReleases(): Promise<RsuRelease[]>;
  saveRsuReleases(releases: RsuRelease[]): Promise<void>;
  clearRsuReleases(): Promise<void>;

  // Sales
  getSaleLots(): Promise<SaleLot[]>;
  saveSaleLots(lots: SaleLot[]): Promise<void>;
  clearSaleLots(): Promise<void>;

  // Forex rates
  getForexRates(): Promise<ForexRate[]>;
  saveForexRates(rates: ForexRate[]): Promise<void>;
  clearForexRates(): Promise<void>;

  // Config
  getConfig(): Promise<AppConfig | null>;
  saveConfig(config: AppConfig): Promise<void>;

  // Lifecycle
  clearAll(): Promise<void>;
}
