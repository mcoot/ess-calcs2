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
  grantDate: string;       // ISO date string
  vestingDate: string;     // ISO date string
  symbol: string;
  sharesGranted: number;
  sharesForfeit: number;
  sharesVested: number;
  grantPriceUsd: USD;
  vestingPriceUsd: USD;
}

export interface VestingScheduleEntry {
  vestingDate: string;     // ISO date string
  sharesVesting: number;
  grantDate: string;
  symbol: string;
}

export interface RsuRelease {
  releaseDate: string;     // ISO date string
  symbol: string;
  sharesReleased: number;
  sharesWithheld: number;
  netShares: number;
  releasePriceUsd: USD;
  totalValueUsd: USD;
}

export interface SaleLot {
  saleDate: string;        // ISO date string
  symbol: string;
  sharesSold: number;
  salePriceUsd: USD;
  acquisitionDate: string;
  acquisitionPriceUsd: USD;
  proceedsUsd: USD;
}

export interface ForexRate {
  date: string;            // ISO date string
  audPerUsd: number;
}

export interface AppConfig {
  financialYear: number;   // e.g. 2024 = FY2023-24
  marginalTaxRate: number; // 0–1
}
