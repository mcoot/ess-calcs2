import type { DataStore } from "./data-store";
import type { Award, VestingScheduleEntry, RsuRelease, SaleLot, ForexRate, AppConfig } from "@/types";
import { FakeStore } from "./fake/fake.store";

const DB_VERSION = 1;
const DEFAULT_DB_NAME = "ess-calcs2";

const STORE_NAMES = [
  "awards",
  "vestingSchedule",
  "releases",
  "saleLots",
  "forexRates",
  "config",
] as const;

function openRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function awaitTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export class IndexedDBStore implements DataStore {
  private constructor(private db: IDBDatabase) {}

  static async create(dbName: string = DEFAULT_DB_NAME): Promise<DataStore> {
    if (typeof globalThis.indexedDB === "undefined" || !globalThis.indexedDB) {
      console.warn("IndexedDB unavailable, falling back to in-memory store");
      return new FakeStore();
    }

    const request = globalThis.indexedDB.open(dbName, DB_VERSION);

    return new Promise<DataStore>((resolve, reject) => {
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("awards", { keyPath: "grantNumber" });
        db.createObjectStore("vestingSchedule", { autoIncrement: true });
        db.createObjectStore("releases", { keyPath: "releaseReferenceNumber" });
        db.createObjectStore("saleLots", { autoIncrement: true });
        db.createObjectStore("forexRates", { keyPath: "date" });
        db.createObjectStore("config", { keyPath: "key" });
      };
      request.onsuccess = () => resolve(new IndexedDBStore(request.result));
      request.onerror = () => reject(request.error);
    });
  }

  // ── Generic helpers ─────────────────────────────────────────────

  private async getAll<T>(storeName: string): Promise<T[]> {
    const tx = this.db.transaction(storeName, "readonly");
    return openRequest<T[]>(tx.objectStore(storeName).getAll());
  }

  private async saveAll<T>(storeName: string, records: T[]): Promise<void> {
    const tx = this.db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.clear();
    for (const record of records) {
      store.put(record);
    }
    await awaitTransaction(tx);
  }

  private async clearStore(storeName: string): Promise<void> {
    const tx = this.db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).clear();
    await awaitTransaction(tx);
  }

  // ── Awards ──────────────────────────────────────────────────────

  getAwards(): Promise<Award[]> {
    return this.getAll("awards");
  }

  saveAwards(awards: Award[]): Promise<void> {
    return this.saveAll("awards", awards);
  }

  clearAwards(): Promise<void> {
    return this.clearStore("awards");
  }

  // ── Vesting Schedule ────────────────────────────────────────────

  getVestingSchedule(): Promise<VestingScheduleEntry[]> {
    return this.getAll("vestingSchedule");
  }

  saveVestingSchedule(entries: VestingScheduleEntry[]): Promise<void> {
    return this.saveAll("vestingSchedule", entries);
  }

  clearVestingSchedule(): Promise<void> {
    return this.clearStore("vestingSchedule");
  }

  // ── RSU Releases ────────────────────────────────────────────────

  getRsuReleases(): Promise<RsuRelease[]> {
    return this.getAll("releases");
  }

  saveRsuReleases(releases: RsuRelease[]): Promise<void> {
    return this.saveAll("releases", releases);
  }

  clearRsuReleases(): Promise<void> {
    return this.clearStore("releases");
  }

  // ── Sale Lots ───────────────────────────────────────────────────

  getSaleLots(): Promise<SaleLot[]> {
    return this.getAll("saleLots");
  }

  saveSaleLots(lots: SaleLot[]): Promise<void> {
    return this.saveAll("saleLots", lots);
  }

  clearSaleLots(): Promise<void> {
    return this.clearStore("saleLots");
  }

  // ── Forex Rates ─────────────────────────────────────────────────

  getForexRates(): Promise<ForexRate[]> {
    return this.getAll("forexRates");
  }

  saveForexRates(rates: ForexRate[]): Promise<void> {
    return this.saveAll("forexRates", rates);
  }

  clearForexRates(): Promise<void> {
    return this.clearStore("forexRates");
  }

  // ── Config ──────────────────────────────────────────────────────

  async getConfig(): Promise<AppConfig | null> {
    const tx = this.db.transaction("config", "readonly");
    const result = await openRequest(tx.objectStore("config").get("appConfig"));
    if (!result) return null;
    const { key, ...config } = result;
    return config as AppConfig;
  }

  async saveConfig(config: AppConfig): Promise<void> {
    const tx = this.db.transaction("config", "readwrite");
    tx.objectStore("config").put({ key: "appConfig", ...config });
    await awaitTransaction(tx);
  }

  // ── Lifecycle ───────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    const tx = this.db.transaction([...STORE_NAMES], "readwrite");
    for (const name of STORE_NAMES) {
      tx.objectStore(name).clear();
    }
    await awaitTransaction(tx);
  }
}
