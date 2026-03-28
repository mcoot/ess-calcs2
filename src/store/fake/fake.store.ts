import type { DataStore } from "../data-store";
import type { Award, VestingScheduleEntry, RsuRelease, SaleLot, ForexRate, AppConfig } from "@/types";

export class FakeStore implements DataStore {
  private awards: Award[] = [];
  private vestingSchedule: VestingScheduleEntry[] = [];
  private releases: RsuRelease[] = [];
  private saleLots: SaleLot[] = [];
  private forexRates: ForexRate[] = [];
  private config: AppConfig | null = null;

  async getAwards(): Promise<Award[]> { return [...this.awards]; }
  async saveAwards(awards: Award[]): Promise<void> { this.awards = [...awards]; }
  async clearAwards(): Promise<void> { this.awards = []; }

  async getVestingSchedule(): Promise<VestingScheduleEntry[]> { return [...this.vestingSchedule]; }
  async saveVestingSchedule(entries: VestingScheduleEntry[]): Promise<void> { this.vestingSchedule = [...entries]; }
  async clearVestingSchedule(): Promise<void> { this.vestingSchedule = []; }

  async getRsuReleases(): Promise<RsuRelease[]> { return [...this.releases]; }
  async saveRsuReleases(releases: RsuRelease[]): Promise<void> { this.releases = [...releases]; }
  async clearRsuReleases(): Promise<void> { this.releases = []; }

  async getSaleLots(): Promise<SaleLot[]> { return [...this.saleLots]; }
  async saveSaleLots(lots: SaleLot[]): Promise<void> { this.saleLots = [...lots]; }
  async clearSaleLots(): Promise<void> { this.saleLots = []; }

  async getForexRates(): Promise<ForexRate[]> { return [...this.forexRates]; }
  async saveForexRates(rates: ForexRate[]): Promise<void> { this.forexRates = [...rates]; }
  async clearForexRates(): Promise<void> { this.forexRates = []; }

  async getConfig(): Promise<AppConfig | null> { return this.config ? { ...this.config } : null; }
  async saveConfig(config: AppConfig): Promise<void> { this.config = { ...config }; }

  async clearAll(): Promise<void> {
    this.awards = [];
    this.vestingSchedule = [];
    this.releases = [];
    this.saleLots = [];
    this.forexRates = [];
    this.config = null;
  }
}
