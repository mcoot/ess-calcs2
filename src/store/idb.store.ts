import type { DataStore } from "./data-store";
import type { Award, VestingScheduleEntry, RsuRelease, SaleLot, ForexRate, AppConfig } from "@/types";

export class IndexedDBStore implements DataStore {
  getAwards(): Promise<Award[]> { throw new Error("not implemented"); }
  saveAwards(_awards: Award[]): Promise<void> { throw new Error("not implemented"); }
  clearAwards(): Promise<void> { throw new Error("not implemented"); }

  getVestingSchedule(): Promise<VestingScheduleEntry[]> { throw new Error("not implemented"); }
  saveVestingSchedule(_entries: VestingScheduleEntry[]): Promise<void> { throw new Error("not implemented"); }
  clearVestingSchedule(): Promise<void> { throw new Error("not implemented"); }

  getRsuReleases(): Promise<RsuRelease[]> { throw new Error("not implemented"); }
  saveRsuReleases(_releases: RsuRelease[]): Promise<void> { throw new Error("not implemented"); }
  clearRsuReleases(): Promise<void> { throw new Error("not implemented"); }

  getSaleLots(): Promise<SaleLot[]> { throw new Error("not implemented"); }
  saveSaleLots(_lots: SaleLot[]): Promise<void> { throw new Error("not implemented"); }
  clearSaleLots(): Promise<void> { throw new Error("not implemented"); }

  getForexRates(): Promise<ForexRate[]> { throw new Error("not implemented"); }
  saveForexRates(_rates: ForexRate[]): Promise<void> { throw new Error("not implemented"); }
  clearForexRates(): Promise<void> { throw new Error("not implemented"); }

  getConfig(): Promise<AppConfig | null> { throw new Error("not implemented"); }
  saveConfig(_config: AppConfig): Promise<void> { throw new Error("not implemented"); }

  clearAll(): Promise<void> { throw new Error("not implemented"); }
}
