import { describe, it, expect } from 'vitest'
import { parseMoney, parseShares, parseBoolean, splitCsvRow } from './csv-utils'

describe('parseMoney', () => {
  it('parses quoted dollar value with commas', () => {
    expect(parseMoney('"$91,148.86"')).toBe(91148.86)
  })

  it('parses simple dollar value', () => {
    expect(parseMoney('$52.6476')).toBe(52.6476)
  })

  it('parses zero', () => {
    expect(parseMoney('$0.00')).toBe(0)
  })
})

describe('parseShares', () => {
  it('parses quoted number with commas', () => {
    expect(parseShares('"5,824"')).toBe(5824)
  })

  it('parses plain number', () => {
    expect(parseShares('475')).toBe(475)
  })
})

describe('parseBoolean', () => {
  it('parses YES and NO', () => {
    expect(parseBoolean('YES')).toBe(true)
    expect(parseBoolean('NO')).toBe(false)
  })

  it('throws on invalid value', () => {
    expect(() => parseBoolean('MAYBE')).toThrow(/invalid boolean/i)
  })
})

describe('splitCsvRow', () => {
  it('splits quoted fields with commas', () => {
    expect(splitCsvRow('a,"$1,234.56",c')).toEqual(['a', '$1,234.56', 'c'])
  })

  it('splits simple row', () => {
    expect(splitCsvRow('a,b,c')).toEqual(['a', 'b', 'c'])
  })
})
