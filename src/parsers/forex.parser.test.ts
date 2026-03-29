import { describe, it, expect } from 'vitest'
import { parseForexCsv } from './forex.parser'
import { AppError, ErrorCodes } from '@/lib/errors'

function makeCsv(...dataRows: string[]): string {
  return dataRows.join('\n')
}

describe('parseForexCsv', () => {
  it('parses a minimal valid CSV with one data row', () => {
    const csv = makeCsv('03-Jan-2023,0.6828,61.40')
    const rates = parseForexCsv(csv)
    expect(rates).toHaveLength(1)
    expect(rates[0].date.getUTCFullYear()).toBe(2023)
    expect(rates[0].date.getUTCMonth()).toBe(0)
    expect(rates[0].date.getUTCDate()).toBe(3)
    expect(rates[0].audToUsd).toBe(0.6828)
  })

  it('returns multiple rows sorted by date ascending', () => {
    const csv = makeCsv(
      '06-Jan-2023,0.6769,61.20',
      '03-Jan-2023,0.6828,61.40',
      '04-Jan-2023,0.6809,61.50',
    )
    const rates = parseForexCsv(csv)
    expect(rates).toHaveLength(3)
    expect(rates[0].audToUsd).toBe(0.6828) // Jan 3
    expect(rates[1].audToUsd).toBe(0.6809) // Jan 4
    expect(rates[2].audToUsd).toBe(0.6769) // Jan 6
  })

  it('throws PARSE_ERROR on empty rate column', () => {
    const csv = makeCsv('03-Jan-2023,,61.40')
    expect(() => parseForexCsv(csv)).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })

  it('throws PARSE_ERROR on non-numeric rate', () => {
    const csv = makeCsv('03-Jan-2023,N/A,61.40')
    expect(() => parseForexCsv(csv)).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })

  it('strips BOM and parses correctly', () => {
    const csv = '\uFEFF' + makeCsv('03-Jan-2023,0.6828,61.40')
    const rates = parseForexCsv(csv)
    expect(rates).toHaveLength(1)
    expect(rates[0].audToUsd).toBe(0.6828)
  })

  it('throws PARSE_ERROR on zero rate', () => {
    const csv = makeCsv('03-Jan-2023,0,61.40')
    expect(() => parseForexCsv(csv)).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })

  it('throws PARSE_ERROR on negative rate', () => {
    const csv = makeCsv('03-Jan-2023,-0.5,61.40')
    expect(() => parseForexCsv(csv)).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })

  it('parses real data first row correctly', () => {
    const csv = makeCsv(
      '03-Jan-2023,0.6828,61.40,4.6994,88.48,0.6400,867.16,0.5656,0.9134,56.51,23.47,1.0760,20.97,2.9975,10635,16039,,,5.3316,,,0.6310,38.07,0.5131',
    )
    const rates = parseForexCsv(csv)
    expect(rates).toHaveLength(1)
    expect(rates[0].audToUsd).toBe(0.6828)
  })

  it('returns empty array for empty CSV', () => {
    const rates = parseForexCsv('')
    expect(rates).toEqual([])
  })

  it('throws PARSE_ERROR on malformed date in data row', () => {
    const csv = makeCsv('bad-date,0.6828,61.40')
    expect(() => parseForexCsv(csv)).toThrow(
      expect.objectContaining({ code: ErrorCodes.PARSE_ERROR }),
    )
  })
})
