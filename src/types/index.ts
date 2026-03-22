// Branded currency types — prevent accidental mixing of USD and AUD values
declare const __usd: unique symbol;
declare const __aud: unique symbol;

export type USD = number & { readonly [__usd]: true };
export type AUD = number & { readonly [__aud]: true };

export function usd(value: number): USD {
  return value as USD;
}

export function aud(value: number): AUD {
  return value as AUD;
}

// Domain interfaces

export interface Award {
  grantDate: Date;
  grantNumber: number;
  grantType: string;
  grantName: string;
  grantReason: string;
  conversionPrice: USD;
  sharesGranted: number;
}

export interface VestingScheduleEntry {
  grantNumber: number;
  vestDate: Date;
  shares: number;
}

export interface RsuRelease {
  grantDate: Date;
  grantNumber: number;
  grantName: string;
  grantReason: string;
  releaseDate: Date;
  sharesVested: number;
  sharesSoldToCover: number;
  sharesHeld: number;
  valueUsd: USD;
  fmvPerShare: USD;
  saleDateSellToCover?: Date;
  salePricePerShare?: USD;
  saleProceeds?: USD;
  sellToCoverAmount: USD;
  releaseReferenceNumber: string;
}

export interface SaleLot {
  withdrawalReferenceNumber: string;
  originatingReleaseRef: string;
  grantNumber: number;
  grantName: string;
  lotNumber: number;
  saleType: string;
  saleDate: Date;
  originalAcquisitionDate: Date;
  soldWithin30Days: boolean;
  costBasisPerShare: USD;
  costBasis: USD;
  sharesSold: number;
  saleProceeds: USD;
  salePricePerShare: USD;
  brokerageCommission: USD;
  supplementalTransactionFee: USD;
}

export interface ForexRate {
  date: Date;
  audToUsd: number;
}

export type DataType = 'awards' | 'vestingSchedule' | 'releases' | 'saleLots' | 'forexRates';

export interface AppConfig {
  displayCurrency: 'USD' | 'AUD';
  lastImportDate?: string;
  importedFileTypes?: DataType[];
}

export interface DataStore {
  getAwards(): Award[];
  setAwards(awards: Award[]): Promise<void>;

  getVestingSchedule(): VestingScheduleEntry[];
  setVestingSchedule(entries: VestingScheduleEntry[]): Promise<void>;

  getReleases(): RsuRelease[];
  setReleases(releases: RsuRelease[]): Promise<void>;

  getSaleLots(): SaleLot[];
  setSaleLots(lots: SaleLot[]): Promise<void>;

  getForexRates(): ForexRate[];
  setForexRates(rates: ForexRate[]): Promise<void>;

  getConfig<K extends keyof AppConfig>(key: K): AppConfig[K] | undefined;
  setConfig<K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<void>;

  clearAll(): Promise<void>;
  clearByType(type: DataType): Promise<void>;
  exportAll(): Promise<DataExport>;
  importAll(data: DataExport): Promise<void>;

  initialize(): Promise<void>;
  isInitialized(): boolean;
}

export interface DataExport {
  version: 1;
  exportedAt: string;
  awards: Award[];
  vestingSchedule: VestingScheduleEntry[];
  releases: RsuRelease[];
  saleLots: SaleLot[];
  config: Partial<AppConfig>;
}
