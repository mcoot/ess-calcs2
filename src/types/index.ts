// Branded currency types — prevent accidental mixing of USD and AUD values
declare const __usd: unique symbol
declare const __aud: unique symbol

export type USD = number & { readonly [__usd]: true }
export type AUD = number & { readonly [__aud]: true }

export function usd(value: number): USD {
  return value as USD
}

export function aud(value: number): AUD {
  return value as AUD
}

// Domain types — derived from Zod schemas
export type {
  Award,
  VestingScheduleEntry,
  RsuRelease,
  SaleLot,
  ForexRate,
  DataType,
  AppConfig,
} from './schemas'

// Re-export schemas for consumers that need runtime validation
export {
  AwardSchema,
  VestingScheduleEntrySchema,
  RsuReleaseSchema,
  SaleLotSchema,
  ForexRateSchema,
  AppConfigSchema,
  DataTypeSchema,
} from './schemas'
