import { describe, it, expect } from 'vitest'
import { parseDDMonYYYY, toDateKey, getFinancialYear, isInFinancialYear } from './dates'
import { AppError, ErrorCodes } from './errors'

// ── parseDDMonYYYY ───────────────────────────────────────────────────

describe('parseDDMonYYYY', () => {
  it('parses a standard date', () => {
    const d = parseDDMonYYYY('03-Jan-2023')
    expect(d.getUTCFullYear()).toBe(2023)
    expect(d.getUTCMonth()).toBe(0)
    expect(d.getUTCDate()).toBe(3)
  })

  it('parses end of year', () => {
    const d = parseDDMonYYYY('31-Dec-2024')
    expect(d.getUTCFullYear()).toBe(2024)
    expect(d.getUTCMonth()).toBe(11)
    expect(d.getUTCDate()).toBe(31)
  })

  it('parses leap year date', () => {
    const d = parseDDMonYYYY('29-Feb-2024')
    expect(d.getUTCFullYear()).toBe(2024)
    expect(d.getUTCMonth()).toBe(1)
    expect(d.getUTCDate()).toBe(29)
  })

  it('throws PARSE_ERROR for invalid leap year date', () => {
    expect(() => parseDDMonYYYY('29-Feb-2023')).toThrow(AppError)
    expect(() => parseDDMonYYYY('29-Feb-2023')).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })

  it('throws PARSE_ERROR for day 31 in 30-day month', () => {
    expect(() => parseDDMonYYYY('31-Apr-2023')).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })

  it('throws PARSE_ERROR for empty string', () => {
    expect(() => parseDDMonYYYY('')).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })

  it('throws PARSE_ERROR for wrong format (ISO)', () => {
    expect(() => parseDDMonYYYY('2023-01-03')).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })

  it('throws PARSE_ERROR for invalid month name', () => {
    expect(() => parseDDMonYYYY('03-Foo-2023')).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })

  it('throws PARSE_ERROR for non-numeric day', () => {
    expect(() => parseDDMonYYYY('XX-Jan-2023')).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })

  it('throws PARSE_ERROR for non-numeric year', () => {
    expect(() => parseDDMonYYYY('03-Jan-XXXX')).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })
})

// ── toDateKey ────────────────────────────────────────────────────────

describe('toDateKey', () => {
  it('formats a standard date', () => {
    expect(toDateKey(new Date(Date.UTC(2023, 0, 3)))).toBe('2023-01-03')
  })

  it('pads single-digit month and day', () => {
    expect(toDateKey(new Date(Date.UTC(2023, 2, 5)))).toBe('2023-03-05')
  })

  it('formats Dec 31', () => {
    expect(toDateKey(new Date(Date.UTC(2024, 11, 31)))).toBe('2024-12-31')
  })
})

// ── getFinancialYear ─────────────────────────────────────────────────

describe('getFinancialYear', () => {
  it('returns current year for Jun 30', () => {
    expect(getFinancialYear(new Date(Date.UTC(2023, 5, 30)))).toBe(2023)
  })

  it('returns next year for Jul 1', () => {
    expect(getFinancialYear(new Date(Date.UTC(2023, 6, 1)))).toBe(2024)
  })

  it('returns current year for mid-Jan', () => {
    expect(getFinancialYear(new Date(Date.UTC(2024, 0, 15)))).toBe(2024)
  })

  it('returns next year for Dec 31', () => {
    expect(getFinancialYear(new Date(Date.UTC(2023, 11, 31)))).toBe(2024)
  })
})

// ── isInFinancialYear ────────────────────────────────────────────────

describe('isInFinancialYear', () => {
  it('Jul 1 is in the FY starting that month', () => {
    expect(isInFinancialYear(new Date(Date.UTC(2023, 6, 1)), 2024)).toBe(true)
  })

  it('Jun 30 is in the FY ending that month', () => {
    expect(isInFinancialYear(new Date(Date.UTC(2024, 5, 30)), 2024)).toBe(true)
  })

  it('Jun 30 of prior year is not in the FY', () => {
    expect(isInFinancialYear(new Date(Date.UTC(2023, 5, 30)), 2024)).toBe(false)
  })

  it('Jul 1 of the ending year is not in the FY', () => {
    expect(isInFinancialYear(new Date(Date.UTC(2024, 6, 1)), 2024)).toBe(false)
  })
})
