import { z } from 'zod'
import { usd } from './index'

// ── Reusable refinements ─────────────────────────────────────────────

const positiveInt = z.number().int().positive()
const nonNegativeInt = z.number().int().nonnegative()
const nonNegativeNumber = z.number().nonnegative()
const positiveNumber = z.number().positive()
const nonEmptyString = z.string().min(1)

// Brand-casting transforms
const usdNonNeg = nonNegativeNumber.transform((v) => usd(v))
const usdPositive = positiveNumber.transform((v) => usd(v))

// ── Award ────────────────────────────────────────────────────────────

export const AwardSchema = z.object({
  grantDate: z.date(),
  grantNumber: positiveInt,
  grantType: nonEmptyString,
  grantName: nonEmptyString,
  grantReason: nonEmptyString,
  conversionPrice: usdNonNeg,
  sharesGranted: positiveInt,
})

export type Award = z.output<typeof AwardSchema>

// ── VestingScheduleEntry ─────────────────────────────────────────────

export const VestingScheduleEntrySchema = z.object({
  grantNumber: positiveInt,
  vestDate: z.date(),
  shares: positiveInt,
})

export type VestingScheduleEntry = z.output<typeof VestingScheduleEntrySchema>

// ── RsuRelease ───────────────────────────────────────────────────────

export const RsuReleaseSchema = z.object({
  grantDate: z.date(),
  grantNumber: positiveInt,
  grantName: nonEmptyString,
  grantReason: nonEmptyString,
  releaseDate: z.date(),
  sharesVested: positiveInt,
  sharesSoldToCover: nonNegativeInt,
  sharesHeld: nonNegativeInt,
  valueUsd: usdPositive,
  fmvPerShare: usdPositive,
  saleDateSellToCover: z.date().optional(),
  salePricePerShare: usdPositive.optional(),
  saleProceeds: usdPositive.optional(),
  sellToCoverAmount: usdNonNeg,
  releaseReferenceNumber: nonEmptyString,
})

export type RsuRelease = z.output<typeof RsuReleaseSchema>

// ── SaleLot ──────────────────────────────────────────────────────────

export const SaleLotSchema = z.object({
  withdrawalReferenceNumber: nonEmptyString,
  originatingReleaseRef: nonEmptyString,
  grantNumber: positiveInt,
  grantName: nonEmptyString,
  lotNumber: positiveInt,
  saleType: nonEmptyString,
  saleDate: z.date(),
  originalAcquisitionDate: z.date(),
  soldWithin30Days: z.boolean(),
  costBasisPerShare: usdNonNeg,
  costBasis: usdNonNeg,
  sharesSold: positiveInt,
  saleProceeds: usdNonNeg,
  salePricePerShare: usdPositive,
  brokerageCommission: usdNonNeg,
  supplementalTransactionFee: usdNonNeg,
})

export type SaleLot = z.output<typeof SaleLotSchema>

// ── ForexRate ────────────────────────────────────────────────────────

export const ForexRateSchema = z.object({
  date: z.date(),
  audToUsd: positiveNumber,
})

export type ForexRate = z.output<typeof ForexRateSchema>

// ── AppConfig ────────────────────────────────────────────────────────

export const DataTypeSchema = z.enum([
  'awards',
  'vestingSchedule',
  'releases',
  'saleLots',
  'forexRates',
])

export type DataType = z.infer<typeof DataTypeSchema>

export const AppConfigSchema = z.object({
  displayCurrency: z.enum(['USD', 'AUD']),
  lastImportDate: z.string().optional(),
  importedFileTypes: z.array(DataTypeSchema).optional(),
})

export type AppConfig = z.output<typeof AppConfigSchema>
