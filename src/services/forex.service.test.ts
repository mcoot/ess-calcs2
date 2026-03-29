import { describe, it, expect } from 'vitest'
import { createForexService } from './forex.service'
import { AppError, ErrorCodes } from '@/lib/errors'
import { usd, aud } from '@/types'
import type { ForexRate } from '@/types'
import { d } from '@/test-helpers'

const TEST_RATES: ForexRate[] = [
  { date: d(2023, 1, 3), audToUsd: 0.6828 },
  { date: d(2023, 1, 4), audToUsd: 0.6809 },
  { date: d(2023, 1, 5), audToUsd: 0.685 },
  { date: d(2023, 1, 6), audToUsd: 0.6769 },
  { date: d(2023, 1, 9), audToUsd: 0.6901 },
]

describe('ForexService', () => {
  const service = createForexService(TEST_RATES)

  describe('getRate', () => {
    it('returns exact match for a known date', () => {
      const result = service.getRate(d(2023, 1, 3))
      expect(result.rate).toBe(0.6828)
      expect(result.rateDate).toEqual(d(2023, 1, 3))
    })

    it('falls back to Friday for Saturday', () => {
      const result = service.getRate(d(2023, 1, 7))
      expect(result.rate).toBe(0.6769)
      expect(result.rateDate).toEqual(d(2023, 1, 6))
    })

    it('falls back to Friday for Sunday', () => {
      const result = service.getRate(d(2023, 1, 8))
      expect(result.rate).toBe(0.6769)
      expect(result.rateDate).toEqual(d(2023, 1, 6))
    })

    it('throws MISSING_RATE for date before all data', () => {
      expect(() => service.getRate(d(2022, 12, 31))).toThrow(AppError)
      expect(() => service.getRate(d(2022, 12, 31))).toThrow(
        expect.objectContaining({ code: ErrorCodes.MISSING_RATE }),
      )
    })

    it('throws MISSING_RATE for date after latest rate', () => {
      expect(() => service.getRate(d(2025, 1, 1))).toThrow(AppError)
      expect(() => service.getRate(d(2025, 1, 1))).toThrow(
        expect.objectContaining({ code: ErrorCodes.MISSING_RATE }),
      )
    })
  })

  describe('usdToAud', () => {
    it('converts USD to AUD using the rate for the date', () => {
      const result = service.usdToAud(usd(100), d(2023, 1, 3))
      expect(result.aud).toBeCloseTo(146.46, 2)
      expect(result.rate).toBe(0.6828)
      expect(result.rateDate).toEqual(d(2023, 1, 3))
    })
  })

  describe('audToUsd', () => {
    it('converts AUD to USD using the rate for the date', () => {
      const result = service.audToUsd(aud(100), d(2023, 1, 3))
      expect(result.usd).toBeCloseTo(68.28, 2)
      expect(result.rate).toBe(0.6828)
      expect(result.rateDate).toEqual(d(2023, 1, 3))
    })
  })

  describe('round-trip', () => {
    it('usdToAud then audToUsd returns approximately the original', () => {
      const original = usd(250)
      const { aud: converted } = service.usdToAud(original, d(2023, 1, 3))
      const { usd: roundTripped } = service.audToUsd(converted, d(2023, 1, 3))
      expect(roundTripped).toBeCloseTo(original, 0)
      expect(Math.abs(roundTripped - original)).toBeLessThanOrEqual(0.01)
    })
  })

  describe('getDateRange', () => {
    it('returns the earliest and latest dates from the data', () => {
      const range = service.getDateRange()
      expect(range.earliest).toEqual(d(2023, 1, 3))
      expect(range.latest).toEqual(d(2023, 1, 9))
    })
  })

  describe('edge cases', () => {
    it('throws MISSING_RATE when created with empty rates', () => {
      const empty = createForexService([])
      expect(() => empty.getRate(d(2023, 1, 3))).toThrow(AppError)
      expect(() => empty.getRate(d(2023, 1, 3))).toThrow(
        expect.objectContaining({ code: ErrorCodes.MISSING_RATE }),
      )
    })
  })
})
